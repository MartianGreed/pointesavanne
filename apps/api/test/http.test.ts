import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { CommandBus, IdempotencyStore, QueryBus } from "@structure-ai/cqrs"
import { InMemoryAll } from "@structure-ai/eventsourcing"
import { TestAuth } from "@structure-ai/bdd"
import * as Migrations from "@structure-ai/migrations"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Context, Effect, Exit, Layer, Redacted, Scope } from "effect"
import { Docs, Health, serveTest } from "@structure-ai/http"
import { HttpApiBuilder, HttpServer } from "@structure-ai/http"
import { Readiness } from "@structure-ai/runtime"
import { layer as observabilityLayer } from "@structure-ai/observability"
import {
  AppAuthTag,
  AuthorizerLive,
  DomainConfigTag,
  FileNotFound,
  FileStore,
  Mailer,
  QuotationPdf,
  TENANT_ID,
  defaultVilla,
  handlers,
  MutableVillaCatalog,
  runWorkersOnce,
  tenantConfigOf,
  viewMigrations,
} from "@pointesavanne/domain"
import { ApiWithMiddleware } from "../src/http.ts"
import type { ApiConfig } from "../src/settings.ts"

/**
 * HTTP-level test: real sockets, the real policy stack, the real auth
 * handler mounted at /auth, principal resolution from the session cookie —
 * only the durable adapters are in-memory doubles.
 */

const config: ApiConfig = {
  http: { port: 0 },
  databaseUrl: Redacted.make("postgres://test"),
  baseUrl: new URL("http://127.0.0.1:3000"),
  adminMail: "admin@pointesavanne.test",
  ownerEmails: "owner@pointesavanne.test",
  filesDir: "./var/test-files",
  // deno-lint-ignore no-explicit-any
  obs: { logLevel: "info", logFormat: "json", otlpUrl: { _tag: "None" } } as any,
}

const mails: Array<{ to: string; subject: string }> = []
const files = new Map<string, Uint8Array>()
const catalog = MutableVillaCatalog()
catalog.set(defaultVilla)

// The auth test kit: the real auth service + Web handler over in-memory
// doubles, with every e-mail (tokens included) recorded for the steps below.
const testAuth = TestAuth.make({ tenantId: TENANT_ID, baseUrl: config.baseUrl, tenant: tenantConfigOf(config.baseUrl) })
const authEmails = testAuth.emails
const AppAuthLive = Layer.succeed(AppAuthTag, {
  auth: testAuth.auth,
  handler: testAuth.authHandler.handler,
  tenantConfig: tenantConfigOf(config.baseUrl),
})

const TestLayers = serveTest.pipe(
  Layer.provide(Docs.layer()),
  Layer.provide(ApiWithMiddleware),
  Layer.provideMerge(
    // The convenience `busesLayer` bakes in Authorizer.allowAll — build the
    // buses explicitly so the real policy guards every dispatch.
    Layer.mergeAll(CommandBus.layer, QueryBus.layer).pipe(
      Layer.provide(handlers),
      Layer.provide(AuthorizerLive),
      Layer.provideMerge(IdempotencyStore.inMemory),
    ),
  ),
  Layer.provideMerge(Layer.succeed(Mailer, Mailer.of({ send: (mail) => Effect.sync(() => void mails.push(mail)) }))),
  Layer.provideMerge(
    Layer.succeed(
      FileStore,
      FileStore.of({
        save: (path, content) => Effect.sync(() => void files.set(path, content)),
        read: (path) =>
          Effect.suspend(() => {
            const content = files.get(path)
            return content === undefined ? Effect.fail(new FileNotFound()) : Effect.succeed(content)
          }),
      }),
    ),
  ),
  Layer.provideMerge(
    Layer.succeed(
      QuotationPdf,
      QuotationPdf.of({ render: (booking) => Effect.succeed(new TextEncoder().encode(`devis:${booking.bookingId}`)) }),
    ),
  ),
  Layer.provideMerge(catalog.layer),
  Layer.provideMerge(Layer.succeed(DomainConfigTag, config)),
  Layer.provideMerge(AppAuthLive),
  Layer.provideMerge(Migrations.layer(viewMigrations)),
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })),
  Layer.provideMerge(InMemoryAll),
  Layer.provide(Readiness.layer),
  Layer.provide(
    observabilityLayer({ service: { name: "pointesavanne-api-test", version: "0.0.0" }, logLevel: "none" as never, logFormat: "json" }),
  ),
)

const scope = Effect.runSync(Scope.make())
let context: Context.Context<Layer.Layer.Success<typeof TestLayers>>
let baseUrl = ""

beforeAll(async () => {
  context = await Effect.runPromise(Layer.buildWithScope(TestLayers, scope))
  const server = Context.get(context, HttpServer.HttpServer)
  const address = server.address
  if (address._tag !== "TcpAddress") throw new Error("expected a tcp address")
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await Effect.runPromise(Scope.close(scope, Exit.void))
})

/** Runs every projection to the head — the worker loop's test equivalent. */
const runWorkers = () =>
  Effect.runPromise(
    Effect.provide(
      runWorkersOnce as never,
      Layer.succeedContext(context),
    ),
  )

const json = (method: string, path: string, body?: unknown, cookie?: string) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      // Mutations are origin-checked against the request's own origin.
      origin: new URL(baseUrl).origin,
      ...(cookie !== undefined ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

describe("auth surface", () => {
  test("register → verify → sign-in issues a session cookie", async () => {
    const registered = await json("POST", "/auth/register/password", {
      email: "customer@example.com",
      password: "long-customer-password",
    })
    expect(registered.status).toBeGreaterThanOrEqual(200)
    expect(registered.status).toBeLessThan(300)

    const verification = authEmails.find((email) => email.kind === "email-verification")
    expect(verification).toBeDefined()
    const verified = await json("POST", "/auth/verify-email", { token: verification!.token })
    expect(verified.status).toBeLessThan(300)

    const signedIn = await json("POST", "/auth/sign-in/password", {
      email: "customer@example.com",
      password: "long-customer-password",
    })
    expect(signedIn.status).toBe(200)
    const setCookie = signedIn.headers.get("set-cookie")
    expect(setCookie).toContain("pointesavanne_session=")

    const session = await json(
      "GET",
      "/auth/session",
      undefined,
      setCookie?.split(";")[0],
    )
    expect(session.status).toBe(200)
    const body = (await session.json()) as { session: { user: { email: string } } | null }
    expect(body.session?.user.email).toBe("customer@example.com")
  })
})

describe("booking api", () => {
  test("an anonymous quotation request is denied at the bus (403 Unauthorized)", async () => {
    const response = await json("POST", "/bookings/quotation", {
      villaId: "villa-de-standing-pointe-savanne",
      from: "2022-05-30",
      to: "2022-06-13",
      adultsCount: 4,
      childrenCount: 2,
    })
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe("Unauthorized")
  })

  test("a signed-in customer can request a quotation end to end", async () => {
    // register + verify + sign in
    await json("POST", "/auth/register/password", {
      email: "booking@example.com",
      password: "long-booking-password",
    })
    const verification = authEmails.find((email) => email.kind === "email-verification" && email.to === "booking@example.com")
    await json("POST", "/auth/verify-email", { token: verification!.token })
    const signedIn = await json("POST", "/auth/sign-in/password", {
      email: "booking@example.com",
      password: "long-booking-password",
    })
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0]!

    // save the profile (the second call of the client registration flow)
    const profileSaved = await json(
      "POST",
      "/customers/profile",
      {
        email: "booking@example.com",
        firstname: "Valentin",
        lastname: "Dosimont",
        phoneNumber: "0782848227",
      },
      cookie,
    )
    expect(profileSaved.status).toBe(200)

    // request a quotation
    const requested = await json(
      "POST",
      "/bookings/quotation",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2022-05-30",
        to: "2022-06-13",
        adultsCount: 4,
        childrenCount: 2,
      },
      cookie,
    )
    expect(requested.status).toBe(200)
    const quotation = (await requested.json()) as {
      bookingId: string
      status: string
      pricing: { totalAmount: number; depositAmount: number }
    }
    expect(quotation.status).toBe("quotation-requested")
    expect(quotation.pricing.totalAmount).toBe(3040)

    // the projections (worker loop in production) hydrate the read models
    await runWorkers()

    // availability query is public and reflects the booking
    const availability = await json(
      "GET",
      "/bookings/availability?villaId=villa-de-standing-pointe-savanne&from=2022-06-01&to=2022-06-05",
    )
    expect(availability.status).toBe(200)
    expect(((await availability.json()) as { available: boolean }).available).toBe(false)

    // the customer lists their bookings
    const mine = await json("GET", "/bookings/my", undefined, cookie)
    expect(mine.status).toBe(200)
    expect(((await mine.json()) as { items: unknown[] }).items).toHaveLength(1)

    // another customer cannot read this booking (403), the owner could
    await json("POST", "/auth/register/password", { email: "other@example.com", password: "long-other-password-1" })
    const otherVerification = authEmails.find((email) => email.kind === "email-verification" && email.to === "other@example.com")
    await json("POST", "/auth/verify-email", { token: otherVerification!.token })
    const otherSignedIn = await json("POST", "/auth/sign-in/password", {
      email: "other@example.com",
      password: "long-other-password-1",
    })
    const otherCookie = otherSignedIn.headers.get("set-cookie")!.split(";")[0]!
    const forbidden = await json("GET", `/bookings/${quotation.bookingId}`, undefined, otherCookie)
    // Declared business failures (0.0.4 contract): the handler's row-level
    // PermissionDenied surfaces as a typed 422, not a taxonomy problem.
    expect(forbidden.status).toBe(422)
    expect(((await forbidden.json()) as { _tag: string })._tag).toBe("PermissionDenied")

    const own = await json("GET", `/bookings/${quotation.bookingId}`, undefined, cookie)
    expect(own.status).toBe(200)
    expect(((await own.json()) as { customerId: string }).customerId).toBeTruthy()
  })
})

describe("health and docs", () => {
  test("/health/live answers, /openapi.json documents the api", async () => {
    const live = await json("GET", "/health/live")
    expect(live.status).toBe(200)

    const docs = await json("GET", "/openapi.json")
    expect(docs.status).toBe(200)
    const spec = (await docs.json()) as { info: { title: string }; paths: Record<string, unknown> }
    expect(spec.info.title).toBe("Villa Pointe Savanne API")
    expect(spec.paths["/bookings/quotation"]).toBeDefined()
    expect(spec.paths["/customers/profile"]).toBeDefined()
    // /auth/* is the framework's Web handler mounted at the edge, not a
    // declared api group — it is intentionally not part of the OpenAPI spec.
  })
})
