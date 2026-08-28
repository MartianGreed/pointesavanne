import { layer as busesLayer, IdempotencyStore } from "@structure-ai/cqrs"
import { InMemoryAll } from "@structure-ai/eventsourcing"
import { ScenarioWorld, TestAuth, type TestAuth as TestAuthService } from "@structure-ai/bdd"
import { layerSilent } from "@structure-ai/observability"
import * as Migrations from "@structure-ai/migrations"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Context, Effect, Layer, type Scope } from "effect"
import { MutableVillaCatalog } from "../src/catalog.ts"
import { handlers } from "../src/handlers.ts"
import { AppAuthTag, tenantConfigOf } from "../src/auth.ts"
import { FileNotFound, FileStore, Mailer, QuotationPdf, type OutgoingMail, type QuotationBookingData } from "../src/infra.ts"
import { viewMigrations } from "../src/migrations.ts"
import { TENANT_ID } from "../src/policy.ts"
import { DomainConfigTag, type DomainConfig } from "../src/settings.ts"
import { runWorkersOnce } from "../src/views.ts"

/**
 * The scenario composition: the production wiring with every durable adapter
 * swapped for an in-memory double — in-memory event store, sqlite :memory:
 * view tables, the auth kit's in-memory auth stack, recording mailer and
 * file store, and a catalog the fixtures install villas into. The bus
 * authorizer is allow-all; steps pass the acting customer explicitly
 * (`dispatch.actor`), and the HTTP-level test exercises the real policy
 * stack. One world per scenario, built inside the scope the feature suite
 * owns and torn down with it.
 */

export interface TestDoubles {
  readonly mails: Array<OutgoingMail>
  readonly files: Map<string, Uint8Array>
  readonly catalog: ReturnType<typeof MutableVillaCatalog>
  readonly config: DomainConfig
}

const testConfig: DomainConfig = {
  baseUrl: new URL("http://localhost:3000"),
  adminMail: "admin@pointesavanne.test",
  ownerEmails: "",
}

const worldLayerOf = (doubles: TestDoubles, testAuth: TestAuthService) => {
  // The buses consume the ports; the same port layer instance is also
  // merged into the world context so steps and projections reach it
  // (Effect memoizes the shared reference — it builds once).
  const PortsLive = Layer.mergeAll(
    Layer.succeed(
      Mailer,
      Mailer.of({ send: (mail) => Effect.sync(() => void doubles.mails.push(mail)) }),
    ),
    Layer.succeed(
      FileStore,
      FileStore.of({
        save: (path: string, content: Uint8Array) => Effect.sync(() => void doubles.files.set(path, content)),
        read: (path: string) =>
          Effect.suspend(() => {
            const content = doubles.files.get(path)
            return content === undefined ? Effect.fail(new FileNotFound()) : Effect.succeed(content)
          }),
      }),
    ),
    Layer.succeed(
      QuotationPdf,
      QuotationPdf.of({
        render: (booking: QuotationBookingData) =>
          Effect.succeed(new TextEncoder().encode(`devis:${booking.bookingId}:${booking.customer.email}`)),
      }),
    ),
    doubles.catalog.layer,
    Layer.succeed(DomainConfigTag, testConfig),
  )

  const tenantConfig = tenantConfigOf(testConfig.baseUrl)
  return Layer.mergeAll(
    busesLayer.pipe(
      Layer.provide(handlers),
      Layer.provide(IdempotencyStore.inMemory),
      Layer.provide(PortsLive),
    ),
    PortsLive,
    Layer.succeed(AppAuthTag, { auth: testAuth.auth, handler: testAuth.authHandler.handler, tenantConfig }),
  ).pipe(
    Layer.provideMerge(Migrations.layer(viewMigrations)),
    Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })),
    Layer.provideMerge(InMemoryAll),
    Layer.provide(layerSilent),
  )
}

/** Every service the scenario world carries (buses, stores, ports, config). */
export type WorldServices = Layer.Layer.Success<ReturnType<typeof worldLayerOf>>

/** A pending quotation request accumulated by `Given` steps. */
export interface QuotationRequestData {
  readonly villaName: string
  readonly from: string
  readonly to: string
  readonly adultsCount: number
  readonly childrenCount: number
}

export interface UpdatePasswordRequest {
  readonly email: string | null
  readonly currentPassword: string | null
  readonly newPassword: string
}

/** The quotation a successful request produced (asserted by `Then` steps). */
export interface QuotationResult {
  readonly bookingId: string
  readonly status: string
  readonly pricing: {
    readonly totalAmount: number
    readonly unrankedTouristTax: number
    readonly rankedTouristTax: number
    readonly depositAmount: number
    readonly householdAmount: number
  }
}

/**
 * The per-scenario world: doubles, the auth test kit and the scenario state
 * the step definitions accumulate. Actors live in the base class registry;
 * bus dispatches and raw service calls (`attempt`) record their exits, so
 * `Then` steps assert with `expectSuccess`/`expectFailure`.
 */
export class DomainWorld extends ScenarioWorld<WorldServices> {
  readonly doubles: TestDoubles
  readonly testAuth: TestAuthService

  /** Password per registered email (auth-service steps re-sign-in with it). */
  readonly registeredPasswords = new Map<string, string>()
  /** Session token per email (login / password-change steps). */
  readonly sessions = new Map<string, string>()

  // Booking fixtures installed by the background steps.
  villaName = ""
  cautionAmount = 0
  householdAmount = 0
  seasonalRanges: Array<{ from: string; to: string; weeklyAmount: number }> = []
  discountRanges: Array<{ fromNights: number; toNights: number; percent: number }> = []

  // Pending requests staged by `Given` steps.
  registerRequest?: { email: string; password: string; phone: string; firstname: string; lastname: string }
  loginRequest?: { email: string; password: string }
  recoverRequestEmail?: string
  updatePasswordRequest?: UpdatePasswordRequest
  lastResetToken?: string
  quotationRequest?: QuotationRequestData
  profileRequest?: { language?: string; firstname?: string; lastname?: string; line1?: string; line3?: string }

  // Observed results.
  quotationResult?: QuotationResult
  quotationOwnerId?: string
  emailCountMark = 0
  /** The email login/profile steps act as (kept even without an actor). */
  currentEmail?: string

  constructor(scope: Scope.Scope, context: Context.Context<WorldServices>, doubles: TestDoubles, testAuth: TestAuthService) {
    super(scope, context)
    this.doubles = doubles
    this.testAuth = testAuth
  }

  /** Processes every projection to the head (the manual drain of this suite). */
  readonly runWorkers = (): Effect.Effect<void, never, never> =>
    this.use(runWorkersOnce as Effect.Effect<void, never, WorldServices>)
}

/** Builds a fresh scenario world inside the suite-owned scope. */
export const buildWorld = (scope: Scope.Scope): Effect.Effect<DomainWorld, never, never> =>
  Effect.gen(function* () {
    const doubles: TestDoubles = {
      mails: [],
      files: new Map<string, Uint8Array>(),
      catalog: MutableVillaCatalog(),
      config: testConfig,
    }
    const testAuth = TestAuth.make({
      tenantId: TENANT_ID,
      baseUrl: testConfig.baseUrl,
      tenant: tenantConfigOf(testConfig.baseUrl),
    })
    // Build failures (config, migrations, sql) are test-infra defects: die.
    const context = yield* Layer.buildWithScope(worldLayerOf(doubles, testAuth), scope).pipe(Effect.orDie)
    return new DomainWorld(scope, context, doubles, testAuth)
  })
