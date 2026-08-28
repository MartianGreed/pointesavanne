import { SqlClient } from "@effect/sql/SqlClient"
import { launch, Readiness, Shutdown } from "@structure-ai/runtime"
import { Projection } from "@structure-ai/eventsourcing"
import { Duration, Effect, Fiber, Layer } from "effect"
import { productionLayers } from "./app.ts"
import { allProjections } from "./views.ts"
import type { AppEvent } from "./events.ts"

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
  // generator, each polling the global feed. Interrupted at shutdown.
  const workers = allProjections as ReadonlyArray<Projection.Projection<AppEvent, never, never>>
  const fibers = yield* Effect.forEach(workers, (projection) => Effect.fork(Projection.run(projection)))
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
