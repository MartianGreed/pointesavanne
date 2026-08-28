import { allowAllRateLimiter, inMemoryAuthStore, makeAuth, makeAuthHandler } from "@structure-ai/auth"
import { layer as busesLayer, CommandBus, IdempotencyStore, QueryBus } from "@structure-ai/cqrs"
import { InMemoryAll } from "@structure-ai/eventsourcing"
import { layerSilent } from "@structure-ai/observability"
import * as Migrations from "@structure-ai/migrations"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { SqlClient } from "@effect/sql/SqlClient"
import { Effect, Layer, Redacted, Scope } from "effect"
import { MutableVillaCatalog, VillaCatalog } from "../src/catalog.ts"
import { handlers } from "../src/handlers.ts"
import { AppAuthTag, tenantConfigOf, type AppAuth } from "../src/auth.ts"
import { FileNotFound, FileStore, Mailer, QuotationPdf, type OutgoingMail, type QuotationBookingData } from "../src/infra.ts"
import { viewMigrations } from "../src/migrations.ts"
import { TENANT_ID } from "../src/policy.ts"
import { DomainConfigTag, type DomainConfig } from "../src/settings.ts"
import { runWorkersOnce } from "../src/views.ts"

/**
 * The test composition: the production wiring with every durable adapter
 * swapped for an in-memory double — in-memory event store, sqlite :memory:
 * view tables, in-memory auth store, recording mailer and file store, and a
 * catalog the BDD fixtures install villas into. The bus authorizer is
 * allow-all; steps pass the acting customer explicitly (`dispatch.actor`),
 * and the HTTP-level test exercises the real policy stack.
 */

export interface RecordedAuthEmail {
  readonly to: string
  readonly kind: string
  readonly token: string
  readonly url: string
}

export interface TestDoubles {
  readonly mails: Array<OutgoingMail>
  readonly authEmails: Array<RecordedAuthEmail>
  readonly files: Map<string, Uint8Array>
  readonly catalog: ReturnType<typeof MutableVillaCatalog>
  readonly config: DomainConfig
  readonly auth: AppAuth["auth"]
}

const testConfig: DomainConfig = {
  baseUrl: new URL("http://localhost:3000"),
  adminMail: "admin@pointesavanne.test",
  ownerEmails: "",
}

const MailerLive = (mails: Array<OutgoingMail>) =>
  Layer.succeed(Mailer, Mailer.of({ send: (mail) => Effect.sync(() => void mails.push(mail)) }))

const FileStoreLive = (files: Map<string, Uint8Array>) =>
  Layer.succeed(
    FileStore,
    FileStore.of({
      save: (path: string, content: Uint8Array) => Effect.sync(() => void files.set(path, content)),
      read: (path: string) =>
        Effect.suspend(() => {
          const content = files.get(path)
          return content === undefined ? Effect.fail(new FileNotFound()) : Effect.succeed(content)
        }),
    }),
  )

const PdfLive = Layer.succeed(
  QuotationPdf,
  QuotationPdf.of({
    render: (booking: QuotationBookingData) =>
      Effect.succeed(new TextEncoder().encode(`devis:${booking.bookingId}:${booking.customer.email}`)),
  }),
)

export interface BuiltWorld {
  readonly doubles: TestDoubles
  readonly run: <A, E>(effect: Effect.Effect<A, E, WorldServices>) => Promise<A>
  readonly fail: <A, E>(effect: Effect.Effect<A, E, WorldServices>) => Promise<E>
  /** Exit-based execution: no reliance on rejected-promise shapes. */
  readonly attempt: <A, E>(effect: Effect.Effect<A, E, WorldServices>) => Promise<{ ok: true; value: A } | { ok: false; error: E }>
  readonly runWorkers: () => Promise<void>
}

export const buildTestWorld = (): Effect.Effect<BuiltWorld, never, never> =>
  Effect.gen(function* () {
    const mails: Array<OutgoingMail> = []
    const authEmails: Array<RecordedAuthEmail> = []
    const files = new Map<string, Uint8Array>()
    const catalog = MutableVillaCatalog()

    const authStore = inMemoryAuthStore()
    const tenantConfig = tenantConfigOf(testConfig.baseUrl)
    const auth = makeAuth({
      store: authStore.store,
      resolveTenant: () => Effect.succeed(tenantConfig),
      emailSender: {
        send: (email) =>
          Effect.sync(() =>
            void authEmails.push({
              to: email.to,
              kind: email.kind,
              token: Redacted.value(email.token),
              url: email.url,
            }),
          ),
      },
      rateLimiter: allowAllRateLimiter,
    })
    const authHandler = makeAuthHandler(auth, { resolveTenant: () => Effect.succeed(TENANT_ID) })

    const ConfigLive = Layer.succeed(DomainConfigTag, testConfig)
    const AuthLive = Layer.succeed(AppAuthTag, { auth, handler: authHandler.handler, tenantConfig })
    const BusesLive = busesLayer.pipe(Layer.provide(handlers), Layer.provide(IdempotencyStore.inMemory))
    const SqlLive = SqliteClient.layer({ filename: ":memory:" })
    const ViewsMigrationsLive = Migrations.layer(viewMigrations)

    const worldLayer = Layer.mergeAll(
      BusesLive,
      MailerLive(mails),
      FileStoreLive(files),
      PdfLive,
      catalog.layer,
      ConfigLive,
    ).pipe(
      Layer.provideMerge(ViewsMigrationsLive),
      Layer.provideMerge(SqlLive),
      Layer.provideMerge(InMemoryAll),
      Layer.provideMerge(AuthLive),
      Layer.provide(layerSilent),
    )

    const scope = yield* Scope.make()
    const context = yield* Layer.buildWithScope(worldLayer, scope)
    const provide = <A, E>(effect: Effect.Effect<A, E, WorldServices>) =>
      Effect.provide(effect as Effect.Effect<A, E, never>, context) as Effect.Effect<A, E, never>

    const doubles: TestDoubles = { mails, authEmails, files, catalog, config: testConfig, auth }

    return {
      doubles,
      run: (effect) => Effect.runPromise(provide(effect)),
      fail: (effect) => Effect.runPromise(Effect.flip(provide(effect))),
      attempt: <A, E>(effect: Effect.Effect<A, E, WorldServices>) =>
        Effect.runPromise(
          Effect.map(Effect.exit(provide(effect)), (exit): { ok: true; value: A } | { ok: false; error: E } => {
            if (exit._tag === "Success") return { ok: true, value: exit.value }
            const cause: unknown = exit.cause
            const failure =
              typeof cause === "object" && cause !== null && "_tag" in cause && (cause as { _tag: string })._tag === "Fail"
                ? ((cause as unknown as { error: E }).error)
                : (cause as E)
            return { ok: false, error: failure }
          }),
        ),
      runWorkers: () => Effect.runPromise(provide(runWorkersOnce as Effect.Effect<void, never, WorldServices>)),
    }
  }) as Effect.Effect<BuiltWorld, never, never>

export type WorldServices = CommandBus | QueryBus | SqlClient | DomainConfigTag | Mailer | FileStore | VillaCatalog | AppAuthTag
