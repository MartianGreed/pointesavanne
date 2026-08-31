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
  RateCardVillaCatalog,
  TENANT_ID,
  handlers,
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

const mails: Array<{ to: string; subject: string; body: string }> = []
const files = new Map<string, Uint8Array>()

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
  Layer.provideMerge(RateCardVillaCatalog),
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

describe("session permissions (/me)", () => {
  const signInAs = async (email: string, password: string): Promise<string> => {
    await json("POST", "/auth/register/password", { email, password })
    const verification = authEmails.find((mail) => mail.kind === "email-verification" && mail.to === email)
    expect(verification).toBeDefined()
    await json("POST", "/auth/verify-email", { token: verification!.token })
    const signedIn = await json("POST", "/auth/sign-in/password", { email, password })
    expect(signedIn.status).toBe(200)
    return signedIn.headers.get("set-cookie")!.split(";")[0]!
  }

  test("anonymous: authenticated false, no permissions", async () => {
    const response = await json("GET", "/me")
    expect(response.status).toBe(200)
    const body = (await response.json()) as { authenticated: boolean; email?: string; permissions: string[] }
    expect(body.authenticated).toBe(false)
    expect(body.email).toBeUndefined()
    expect(body.permissions).toEqual([])
  })

  test("customer: authenticated with customer permissions, no owner permission", async () => {
    const cookie = await signInAs("me-customer@example.com", "long-customer-password")
    const response = await json("GET", "/me", undefined, cookie)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { authenticated: boolean; email?: string; permissions: string[] }
    expect(body.authenticated).toBe(true)
    expect(body.email).toBe("me-customer@example.com")
    expect(body.permissions).toContain("booking:request")
    expect(body.permissions).toContain("profile:save")
    expect(body.permissions).not.toContain("booking:read-all")
  })

  test("owner: the policy grants booking:read-all", async () => {
    // owner@pointesavanne.test is the configured OWNER_EMAILS address.
    const cookie = await signInAs("owner@pointesavanne.test", "long-owner-password")
    const response = await json("GET", "/me", undefined, cookie)
    expect(response.status).toBe(200)
    const body = (await response.json()) as { authenticated: boolean; email?: string; permissions: string[] }
    expect(body.authenticated).toBe(true)
    expect(body.email).toBe("owner@pointesavanne.test")
    expect(body.permissions).toContain("booking:read-all")
    expect(body.permissions).toContain("booking:validate")
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

describe("quotation lead funnel", () => {
  test("an anonymous lead survives registration and is claimed at first sign-in", async () => {
    // 1. The anonymous visitor asks for a devis — no session, no account.
    const submitted = await json("POST", "/bookings/leads", {
      email: "lead@example.com",
      firstname: "Marie",
      lastname: "Dupont",
      phoneNumber: "+596 696 12 34 56",
      villaId: "villa-de-standing-pointe-savanne",
      from: "2022-07-09",
      to: "2022-07-23",
      adultsCount: 4,
      message: "Arrivée tardive vers 20 h",
    })
    expect(submitted.status).toBe(200)
    const lead = (await submitted.json()) as { leadId: string; status: string }
    expect(lead.status).toBe("submitted")
    expect(lead.leadId).toBe("lead:lead@example.com")

    // A newer anonymous submission replaces the pending one (2 travellers,
    // same dates — the claim below asserts it is this one that won).
    const resubmitted = await json("POST", "/bookings/leads", {
      email: "LEAD@example.com",
      firstname: "Marie",
      lastname: "Dupont",
      phoneNumber: "+596 696 12 34 56",
      villaId: "villa-de-standing-pointe-savanne",
      from: "2022-07-09",
      to: "2022-07-23",
      adultsCount: 2,
      message: "Arrivée tardive vers 20 h",
    })
    expect(resubmitted.status).toBe(200)

    // 2. Registration + verification + sign-in — the e-mail round-trip
    //    that kills any client-side state.
    await json("POST", "/auth/register/password", { email: "lead@example.com", password: "long-lead-password-1" })
    const verification = authEmails.find((mail) => mail.kind === "email-verification" && mail.to === "lead@example.com")
    await json("POST", "/auth/verify-email", { token: verification!.token })
    const signedIn = await json("POST", "/auth/sign-in/password", {
      email: "lead@example.com",
      password: "long-lead-password-1",
    })
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0]!

    // 3. The claim derives the e-mail from the session, converts the lead.
    const claimResponse = await json("POST", "/bookings/leads/claim", {}, cookie)
    expect(claimResponse.status).toBe(200)
    const claim = (await claimResponse.json()) as {
      claimed: number
      bookings: Array<{ bookingId: string; status: string; pricing: { totalAmount: number } }>
      issues: string[]
    }
    expect(claim.claimed).toBe(1)
    expect(claim.issues).toEqual([])
    expect(claim.bookings).toHaveLength(1)
    expect(claim.bookings[0]!.status).toBe("quotation-requested")
    // The pinned legacy algorithm prices this 14-night July stay at 3230 €
    // (2 weeks at 1700 €/week, time-discount applied) — the resubmitted lead.
    expect(claim.bookings[0]!.pricing.totalAmount).toBe(3230)

    // 4. The projections hydrate the read models, then the customer finds
    //    their space already filled: profile + request + owner notification.
    await runWorkers()
    const profile = await json("GET", "/customers/profile", undefined, cookie)
    expect(profile.status).toBe(200)
    const saved = ((await profile.json()) as { profile: { firstname: string; lastname: string; phoneNumber: string } }).profile
    expect(saved.firstname).toBe("Marie")
    expect(saved.lastname).toBe("Dupont")
    expect(saved.phoneNumber).toBe("+596 696 12 34 56")

    // 5. The request is in the customer's space, and the visitor's message
    //    reached the owner's notification.
    const mine = await json("GET", "/bookings/my", undefined, cookie)
    expect(mine.status).toBe(200)
    expect(((await mine.json()) as { items: unknown[] }).items).toHaveLength(1)
    const adminMail = mails.find((mail) => mail.to === config.adminMail && mail.subject.includes(claim.bookings[0]!.bookingId))
    expect(adminMail?.body).toContain("Arrivée tardive vers 20 h")
    // 2 adultes — the resubmitted lead won, not the first one.
    expect(adminMail?.body).toContain("Occupants : 2 adulte(s)")

    // 6. The claim is idempotent: no pending lead, nothing to convert.
    const again = await json("POST", "/bookings/leads/claim", {}, cookie)
    expect(again.status).toBe(200)
    expect(((await again.json()) as { claimed: number }).claimed).toBe(0)

    // 7. Anonymous claims are rejected at the edge (401), and one customer
    //    cannot claim another e-mail's lead — the e-mail is session-derived.
    const anonymous = await json("POST", "/bookings/leads/claim", {})
    expect(anonymous.status).toBe(401)
  })
})

describe("pricing (the owner's rate card)", () => {
  // Registers (idempotently — the owner already exists from the /me tests)
  // and returns the session cookie.
  const signInAs = async (email: string, password: string): Promise<string> => {
    await json("POST", "/auth/register/password", { email, password })
    const verification = authEmails.find((mail) => mail.kind === "email-verification" && mail.to === email)
    if (verification !== undefined) await json("POST", "/auth/verify-email", { token: verification.token })
    const signedIn = await json("POST", "/auth/sign-in/password", { email, password })
    expect(signedIn.status).toBe(200)
    return signedIn.headers.get("set-cookie")!.split(";")[0]!
  }

  test("seasons are owner-only: anonymous and customers are denied", async () => {
    const anonymousList = await json("GET", "/pricing/seasons?villaId=villa-de-standing-pointe-savanne")
    expect(anonymousList.status).toBe(403)
    const anonymousDefine = await json("POST", "/pricing/seasons", {
      villaId: "villa-de-standing-pointe-savanne",
      from: "2099-01-05",
      to: "2099-02-05",
      weeklyAmount: 1400,
    })
    expect(anonymousDefine.status).toBe(403)

    const customerCookie = await signInAs("pricing-customer@example.com", "long-customer-password")
    const denied = await json(
      "GET",
      "/pricing/seasons?villaId=villa-de-standing-pointe-savanne",
      undefined,
      customerCookie,
    )
    expect(denied.status).toBe(403)
  })

  test("the owner manages seasonal prices: seeded card, define, overlap rejection, removal", async () => {
    const cookie = await signInAs("owner@pointesavanne.test", "long-owner-password")

    // The card seeds itself from the legacy code card on first access.
    const seeded = await json("GET", "/pricing/seasons?villaId=villa-de-standing-pointe-savanne", undefined, cookie)
    expect(seeded.status).toBe(200)
    const seasons = ((await seeded.json()) as {
      items: Array<{ seasonId: string; from: string; to: string; weeklyAmount: number }>
    }).items
    expect(seasons.length).toBeGreaterThan(0)
    // What the code card covered, the seeded card still covers.
    expect(seasons.some((season) => season.from <= "2026-09-05" && season.to >= "2026-09-12")).toBe(true)

    // Define a price for a brand-new period.
    const defined = await json(
      "POST",
      "/pricing/seasons",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2099-01-05",
        to: "2099-02-05",
        weeklyAmount: 1400,
      },
      cookie,
    )
    expect(defined.status).toBe(200)
    expect(((await defined.json()) as { seasonId: string }).seasonId).toBe("2099-01-05_2099-02-05")

    // An overlapping period is a typed business failure (422).
    const overlap = await json(
      "POST",
      "/pricing/seasons",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2099-02-01",
        to: "2099-03-01",
        weeklyAmount: 1600,
      },
      cookie,
    )
    expect(overlap.status).toBe(422)
    expect(((await overlap.json()) as { _tag: string; issues: string[] }).issues[0]).toContain("2099-01-05 - 2099-02-05")

    // Removal takes the period back out.
    const removed = await json(
      "POST",
      "/pricing/seasons/removal",
      { villaId: "villa-de-standing-pointe-savanne", seasonId: "2099-01-05_2099-02-05" },
      cookie,
    )
    expect(removed.status).toBe(200)
    const after = await json("GET", "/pricing/seasons?villaId=villa-de-standing-pointe-savanne", undefined, cookie)
    const remaining = ((await after.json()) as { items: Array<{ seasonId: string }> }).items
    expect(remaining.some((season) => season.seasonId === "2099-01-05_2099-02-05")).toBe(false)
  })

  test("an owner-defined price prices new quotations end to end", async () => {
    const ownerCookie = await signInAs("owner@pointesavanne.test", "long-owner-password")
    const defined = await json(
      "POST",
      "/pricing/seasons",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2098-03-01",
        to: "2098-04-30",
        weeklyAmount: 1400,
      },
      ownerCookie,
    )
    expect(defined.status).toBe(200)

    const customerCookie = await signInAs("pricing-quote@example.com", "long-customer-password")
    const requested = await json(
      "POST",
      "/bookings/quotation",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2098-03-09",
        to: "2098-03-16",
        adultsCount: 2,
        childrenCount: 0,
      },
      customerCookie,
    )
    expect(requested.status).toBe(200)
    const quotation = (await requested.json()) as { pricing: { totalAmount: number } }
    expect(quotation.pricing.totalAmount).toBe(1400)
  })
})

describe("quotation documents", () => {
  // Registers, verifies and signs in; returns the session cookie.
  const signInAs = async (email: string, password: string): Promise<string> => {
    await json("POST", "/auth/register/password", { email, password })
    const verification = authEmails.find((mail) => mail.kind === "email-verification" && mail.to === email)
    expect(verification).toBeDefined()
    await json("POST", "/auth/verify-email", { token: verification!.token })
    const signedIn = await json("POST", "/auth/sign-in/password", { email, password })
    expect(signedIn.status).toBe(200)
    return signedIn.headers.get("set-cookie")!.split(";")[0]!
  }

  test("the generated devis downloads for its customer and the owner, and is denied to others", async () => {
    const cookie = await signInAs("documents@example.com", "long-documents-password-1")
    const requested = await json(
      "POST",
      "/bookings/quotation",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2023-05-07",
        to: "2023-05-20",
        adultsCount: 4,
        childrenCount: 2,
      },
      cookie,
    )
    expect(requested.status).toBe(200)
    const { bookingId } = (await requested.json()) as { bookingId: string }

    // The worker loop generates the quotation (file + view row).
    await runWorkers()
    expect(files.get(`booking/${bookingId}/devis.pdf`)).toBeDefined()

    // The customer downloads their devis — the endpoint the customer area
    // and the notification email point at.
    const own = await json("GET", `/bookings/${bookingId}/quotation`, undefined, cookie)
    expect(own.status).toBe(200)
    expect(await own.text()).toBe(`devis:${bookingId}`)
    // The current renderer emits the legacy dompdf HTML input, served inline.
    expect(own.headers.get("content-type")).toContain("text/html")

    // The owner reads every booking's devis.
    const ownerCookie = await signInAs("owner@pointesavanne.test", "long-owner-password")
    const asOwner = await json("GET", `/bookings/${bookingId}/quotation`, undefined, ownerCookie)
    expect(asOwner.status).toBe(200)

    // Another customer is denied at the row level (typed 422).
    const otherCookie = await signInAs("other-documents@example.com", "long-other-password-1")
    const denied = await json("GET", `/bookings/${bookingId}/quotation`, undefined, otherCookie)
    expect(denied.status).toBe(422)
    expect(((await denied.json()) as { _tag: string })._tag).toBe("PermissionDenied")

    // Anonymous access is denied at the bus (403).
    const anonymous = await json("GET", `/bookings/${bookingId}/quotation`)
    expect(anonymous.status).toBe(403)

    // An unknown booking is a typed NotFound.
    const unknown = await json("GET", "/bookings/does-not-exist/quotation", undefined, cookie)
    expect(unknown.status).toBe(422)
    expect(((await unknown.json()) as { _tag: string })._tag).toBe("NotFound")
  })

  test("the signed document downloads for the owner once uploaded", async () => {
    const cookie = await signInAs("signed@example.com", "long-signed-password-1")
    const requested = await json(
      "POST",
      "/bookings/quotation",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2023-06-05",
        to: "2023-06-19",
        adultsCount: 2,
      },
      cookie,
    )
    const { bookingId } = (await requested.json()) as { bookingId: string }
    await runWorkers()

    // Nothing uploaded yet: the document endpoint answers 404.
    const missing = await json("GET", `/bookings/${bookingId}/signed-document`, undefined, cookie)
    expect(missing.status).toBe(404)

    // The customer signs and uploads.
    const uploaded = await json(
      "POST",
      `/bookings/${bookingId}/signed-document`,
      {
        fileName: "signed-quotation.pdf",
        contentBase64: Buffer.from("%PDF-signed-document").toString("base64"),
      },
      cookie,
    )
    expect(uploaded.status).toBe(200)
    expect(((await uploaded.json()) as { status: string }).status).toBe("quotation-signed")

    // The worker loop hydrates the view row (signedFileName) the owner's
    // download reads — and notifies the admin of the signed quotation.
    await runWorkers()

    // The owner downloads what was announced in the notification email.
    const ownerCookie = await signInAs("owner@pointesavanne.test", "long-owner-password")
    const asOwner = await json("GET", `/bookings/${bookingId}/signed-document`, undefined, ownerCookie)
    expect(asOwner.status).toBe(200)
    expect(await asOwner.text()).toBe("%PDF-signed-document")
    expect(asOwner.headers.get("content-type")).toContain("application/pdf")
  })

  test("the owner's validation outcome reaches the customer by email", async () => {
    const cookie = await signInAs("validated@example.com", "long-validated-password")
    // The client registration flow saves the profile the notifications read.
    const profileSaved = await json(
      "POST",
      "/customers/profile",
      {
        email: "validated@example.com",
        firstname: "Valérie",
        lastname: "Datier",
        phoneNumber: "0782848227",
      },
      cookie,
    )
    expect(profileSaved.status).toBe(200)
    const requested = await json(
      "POST",
      "/bookings/quotation",
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: "2023-07-02",
        to: "2023-07-16",
        adultsCount: 2,
      },
      cookie,
    )
    const { bookingId } = (await requested.json()) as { bookingId: string }
    await runWorkers()
    await json(
      "POST",
      `/bookings/${bookingId}/signed-document`,
      {
        fileName: "signed-quotation.pdf",
        contentBase64: Buffer.from("%PDF-signed-document").toString("base64"),
      },
      cookie,
    )

    const ownerCookie = await signInAs("owner@pointesavanne.test", "long-owner-password")
    const before = mails.length
    const validated = await json(
      "POST",
      `/bookings/${bookingId}/validation`,
      { accepted: true },
      ownerCookie,
    )
    expect(validated.status).toBe(200)
    expect(((await validated.json()) as { status: string }).status).toBe("contract-sent")
    await runWorkers()

    const since = mails.slice(before)
    // (the deferred devis-ready notice may drain here too — assert the
    // validation confirmation itself)
    const confirmations = since.filter(
      (mail) => mail.to === "validated@example.com" && mail.subject.includes("confirmée"),
    )
    expect(confirmations.length).toBe(1)
    expect(confirmations[0]!.body).toContain("validé")
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
    expect(spec.paths["/pricing/seasons"]).toBeDefined()
    // /auth/* is the framework's Web handler mounted at the edge, not a
    // declared api group — it is intentionally not part of the OpenAPI spec.
  })
})
