import { SqlClient } from "@effect/sql/SqlClient"
import { launch, Readiness, Shutdown } from "@structure-ai/runtime"
import { Projection } from "@structure-ai/eventsourcing"
import { Cause, Duration, Effect, Exit, Fiber, Layer } from "effect"
import { allProjections, type AppEvent } from "@pointesavanne/domain"
import { productionLayers } from "./app.ts"

/**
 * The API process: config → telemetry → resources (postgres, migrations,
 * event store, auth, buses, http) → workers (projections) → ready. Shutdown
 * flips readiness unready first, drains within the grace period, exits.
 */
const program = Effect.gen(function* () {
  const shutdown = yield* Shutdown
  const readiness = yield* Readiness
  const sql = yield* SqlClient

  // Background workers: view hydration, notifications and the quotation
  // generator, each polling the global feed. Their services (mailer, buses,
  // domain config) are part of the process context — see productionLayers —
  // and a worker that stops says so instead of dying silently.
  const workers = allProjections as ReadonlyArray<Projection.Projection<AppEvent, never, never>>
  const fibers = yield* Effect.forEach(workers, (projection) =>
    Effect.fork(
      Projection.run(projection).pipe(
        Effect.onExit((exit) =>
          exit._tag === "Failure"
            ? Effect.logError(`projection worker "${projection.name}" stopped`).pipe(
                Effect.annotateLogs({ cause: Cause.pretty(exit.cause) }),
              )
            : Effect.void,
        ),
      ),
    ),
  )
  yield* shutdown.onShutdown(
    "projection-workers",
    Effect.forEach(fibers, (fiber) => Fiber.interruptFork(fiber), { discard: true }),
  )

  yield* readiness.register({
    name: "database",
    run: Effect.as(sql`SELECT 1`, true).pipe(Effect.orDie),
  })

  yield* readiness.setReady
  yield* shutdown.awaitShutdown
})

launch(program, {
  layers: Layer.mergeAll(productionLayers, Shutdown.layer()).pipe(Layer.provideMerge(Readiness.layer)),
  gracePeriod: Duration.seconds(30),
})
