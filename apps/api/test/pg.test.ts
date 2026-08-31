import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { AggregateStore, Projection } from "@structure-ai/eventsourcing"
import { layer as esPg } from "@structure-ai/eventsourcing-pg"
import { makeAuthStore, migrate as migrateAuthPg } from "@structure-ai/auth-pg"
import * as Migrations from "@structure-ai/migrations"
import { PgClient } from "@effect/sql-pg"
import { CommandBus } from "@structure-ai/cqrs"
import { Principal } from "@structure-ai/authorization"
import { Readiness, Shutdown } from "@structure-ai/runtime"
import { SQL } from "bun"
import { Effect, Exit, Layer, Redacted, Scope } from "effect"
import {
  Booking,
  BookingId,
  BookingView,
  bookingViews,
  bookingRegistry,
  defaultVilla,
  DomainConfigTag,
  isVillaAvailable,
  Mailer,
  quotationPath,
  RequestQuotation,
  runWorkersOnce,
} from "@pointesavanne/domain"
import { ViewStore } from "@structure-ai/viewmodel"
import { bookkeepingTable, prodMigrations } from "../src/migrations.ts"
import { productionLayers } from "../src/app.ts"

/**
 * Durable-adapter integration against PostgreSQL. Skipped unless
 * DATABASE_URL is set (CI provides a service container; locally:
 * `docker compose up -d` then `bun test test/pg.test.ts`).
 */

const databaseUrl = process.env.DATABASE_URL
const maybe = databaseUrl === undefined ? describe.skip : describe

maybe("postgres adapters", () => {
  const scope = Effect.runSync(Scope.make())

  // Production table layout (es_ prefix + view tables + migrations
  // bookkeeping). CI runs this suite serially against a fresh database.
  const AuthTablePrefix = `it_${Date.now().toString(36)}_auth_`

  const PgLive = PgClient.layer({ url: Redacted.make(databaseUrl!), maxConnections: 5 })
  const MigrationsLive = Migrations.layer(prodMigrations).pipe(Layer.provide(bookkeepingTable()))
  const StoresLive = esPg({ tablePrefix: "es_" })

  const ConfigLive = Layer.succeed(DomainConfigTag, {
    baseUrl: new URL("http://localhost:3000"),
    adminMail: "admin@pointesavanne.test",
    ownerEmails: "",
  })

  const TestLive = StoresLive.pipe(
    Layer.provide(MigrationsLive),
    Layer.provideMerge(ConfigLive),
    Layer.provideMerge(Layer.succeed(Mailer, Mailer.of({ send: () => Effect.void }))),
    Layer.provide(PgLive),
  )

  let cleanupSql: SQL

  beforeAll(async () => {
    await Effect.runPromise(Layer.buildWithScope(TestLive, scope))
    cleanupSql = new SQL({ adapter: "postgres", url: databaseUrl!, max: 2 })
    await Effect.runPromise(migrateAuthPg(cleanupSql, { tablePrefix: AuthTablePrefix }))
  })

  afterAll(async () => {
    const tables = [
      "es_events", "es_snapshots", "es_checkpoints", "es_outbox", "es_inbox",
      "booking_view", "customer_profile_view", "effect_sql_migrations", `${AuthTablePrefix}users`,
    ]
    for (const table of tables) {
      await cleanupSql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`).catch(() => undefined)
    }
    await cleanupSql.close()
    await Effect.runPromise(Scope.close(scope, { _tag: "Exit", ...(await Promise.resolve({})) } as never))
  })

  // deno-lint-ignore no-explicit-any
  const run = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> =>
    Effect.runPromise(Effect.provide(effect, TestLive) as Effect.Effect<A, E, never>)

  test("event store roundtrip: request a booking, project it, query availability", async () => {
    const store = AggregateStore.make(Booking, bookingRegistry)
    const id = BookingId.generate()
    const result = (await run(
      Effect.flatMap(store, (s) =>
        s.executeWithRetry(id, {
          _tag: "RequestBooking",
          id,
          customerId: "pg-customer-1",
          villa: defaultVilla,
          from: "2022-05-30",
          to: "2022-06-13",
          adultsCount: 4,
          childrenCount: 2,
        }),
      ),
    )) as unknown as { state: { status: string; pricing?: { totalAmount: number } } }
    expect(result.state.status).toBe("quotation-requested")
    expect(result.state.pricing?.totalAmount).toBe(3040)

    // the view projection hydrates the table; availability flips to false
    await run(Projection.catchup(bookingViews.projection) as never)
    const available = await run(isVillaAvailable(defaultVilla.villaId, "2022-06-01", "2022-06-05"))
    expect(available).toBe(false)

    const rows = await run(Effect.flatMap(ViewStore.make(BookingView), (vs) => vs.find({ customerId: "pg-customer-1" })))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe("quotation-requested")
  })

  test("auth store: register, verify and sign in over postgres", async () => {
    const authStore = makeAuthStore(cleanupSql, { tablePrefix: AuthTablePrefix })
    // minimal direct-store checks; the full lifecycle is covered by the
    // in-memory suite and the auth package's own pg tests.
    const created = await Effect.runPromise(
      authStore.createPasswordUser(
        {
          id: "pg-user-1",
          tenantId: "pointesavanne",
          email: "pg@example.com",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: "pointesavanne",
          userId: "pg-user-1",
          email: "pg@example.com",
          passwordHash: "argon2id$fake",
          updatedAt: new Date(),
        },
      ) as never,
    )
    void created // createPasswordUser is void; read it back instead
    const found = await Effect.runPromise(
      authStore.findUserByEmail("pointesavanne", "pg@example.com") as never,
    )
    expect((found as { id?: string } | null)?.id).toBe("pg-user-1")
  })

  /**
   * The production composition itself: builds `productionLayers` (real
   * migrations, pg stores, console mailer, local files, http on an
   * ephemeral port) and proves the worker loop runs there — the quotation
   * generator renders the devis into the file store and the notifications
   * projection drains without a missing-service defect. Regression test for
   * the wiring bug where those services were hidden behind a plain
   * `Layer.provide` and the workers' fibers died silently.
   */
  test("production wiring: the worker loop generates the quotation pdf", async () => {
    const filesDir = `./var/pg-wiring-test-${Date.now().toString(36)}`
    const probe = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: { data: () => {}, open: () => {}, close: () => {} },
    })
    const httpPort = String(probe.port)
    probe.stop(true)
    // Real environment wins over dotenv in settings, so pin the process env
    // for the layer build: ephemeral http port, scratch file store, and the
    // required settings CI does not set (LOG_LEVEL, ADMIN_MAIL).
    const keys = ["HTTP_PORT", "FILES_DIR", "LOG_LEVEL", "ADMIN_MAIL"] as const
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
    process.env.HTTP_PORT = httpPort
    process.env.FILES_DIR = filesDir
    process.env.LOG_LEVEL ??= "warn"
    process.env.ADMIN_MAIL ??= "wiring@test.pointesavanne"
    const scope = Effect.runSync(Scope.make())
    try {
      // The exact stack launch() builds: production layers plus the runtime
      // members (shutdown, readiness) it merges in.
      const processLayers = Layer.mergeAll(productionLayers, Shutdown.layer()).pipe(
        Layer.provideMerge(Readiness.layer),
      )
      const context = await Effect.runPromise(Layer.buildWithScope(processLayers, scope))
      const quotation = (await Effect.runPromise(
        Effect.gen(function* () {
          const bus = yield* CommandBus
          return yield* Principal.within({ id: "wiring-test-customer", roles: ["customer"], kind: "user" })(
            bus.dispatch(RequestQuotation, {
              villaId: defaultVilla.villaId,
              from: "2026-11-02",
              to: "2026-11-09",
              adultsCount: 2,
            }),
          )
        }).pipe(Effect.provide(Layer.succeedContext(context)) as never),
      )) as { bookingId: string; status: string }
      expect(quotation.status).toBe("quotation-requested")

      // The worker loop the process forks (view hydration, notifications,
      // quotation generator) drains over the production context.
      await Effect.runPromise(
        Effect.provide(runWorkersOnce as never, Layer.succeedContext(context)),
      )

      // The generator wrote the devis through the local file store.
      const pdf = `${filesDir}/${quotationPath(quotation.bookingId)}`
      expect(await Bun.file(pdf).exists()).toBe(true)
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined)
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key]
        else process.env[key] = previous[key]
      }
      // productionLayers migrates the auth schema under its default prefix.
      for (const table of ["auth_users", "auth_passwords", "auth_tokens", "auth_sessions", "auth_oauth_states", "auth_oauth_identities", "auth_passkey_challenges", "auth_passkeys"]) {
        await cleanupSql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`).catch(() => undefined)
      }
      await cleanupSql.unsafe(`DELETE FROM es_events WHERE stream_id LIKE 'booking:%'`).catch(() => undefined)
    }
  }, 20000)
})
