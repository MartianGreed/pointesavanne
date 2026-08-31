import {
  annotate,
  Api,
  ApiEndpoint,
  ApiGroup,
  ApiSchema,
  Docs,
  Health,
  HttpCqrs,
  NotFoundProblem,
  UnauthorizedProblem,
  withDefaultErrors,
} from "@structure-ai/http"
import { HttpAuthorization } from "@structure-ai/authorization"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import * as HttpApp from "@effect/platform/HttpApp"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { Effect, Layer, Option, Schema } from "effect"
import * as AST from "effect/SchemaAST"
import {
  AppAuthTag,
  BookingRow,
  CheckAvailability,
  ClaimQuotationLeads,
  DefineSeason,
  FileStore,
  GetBooking,
  GetProfile,
  ListAllBookings,
  ListMyBookings,
  ListSeasons,
  RemoveSeason,
  RequestQuotation,
  SaveProfile,
  SignQuotation,
  SubmitQuotationLead,
  ValidateQuotation,
  policy,
  quotationPath,
  resolvePrincipal,
  signedDocumentPath,
} from "@pointesavanne/domain"
import { Authorization, Principal } from "@structure-ai/authorization"

// ---------------------------------------------------------------------------
// API declaration — the OpenAPI contract is generated from this.
// ---------------------------------------------------------------------------

/**
 * Declares a message's failure schema as a typed endpoint error, served
 * with 422 (the bridge unwraps declared business failures so the platform
 * encodes them through this schema instead of taxonomy-mapping to a
 * problem). Mirrors the annotation @structure-ai/http applies to its
 * generated endpoints; manual endpoints must declare it themselves.
 */
const businessFailure = <A, I>(failure: Schema.Schema<A, I>): Schema.Schema<A, I> => {
  const status = HttpApiSchema.annotations({ status: 422 })
  // Status resolution walks union members, so every leaf gets the annotation:
  // flatten nested unions (e.g. AccessFailure) and annotate each member.
  const leaves = (ast: AST.AST): ReadonlyArray<AST.AST> =>
    AST.isUnion(ast) ? ast.types.flatMap(leaves) : [ast]
  const members = leaves(failure.ast).map((member) => AST.annotations(member, status))
  return Schema.make<A, I>(members.length === 1 ? members[0]! : AST.Union.make(members))
}

const bookings = ApiGroup.make("bookings")
  .add(HttpCqrs.commandEndpoint("requestQuotation", "/bookings/quotation", RequestQuotation))
  // The anonymous devis funnel: the lead is submitted without a session and
  // claimed at sign-in (the claim's e-mail is derived from the session
  // principal, never from a client payload).
  .add(HttpCqrs.commandEndpoint("submitQuotationLead", "/bookings/leads", SubmitQuotationLead))
  .add(
    ApiEndpoint.post("claimQuotationLeads")`/bookings/leads/claim`
      .addSuccess(ClaimQuotationLeads.success!)
      .addError(businessFailure(ClaimQuotationLeads.failure!))
      .pipe(withDefaultErrors),
  )
  .add(HttpCqrs.queryEndpoint("listMyBookings", "/bookings/my", ListMyBookings))
  .add(HttpCqrs.queryEndpoint("listAllBookings", "/bookings", ListAllBookings))
  .add(HttpCqrs.queryEndpoint("checkAvailability", "/bookings/availability", CheckAvailability))
  .add(
    ApiEndpoint.get("getBooking")`/bookings/${ApiSchema.param("bookingId", Schema.String)}`
      .addSuccess(BookingRow)
      .addError(businessFailure(GetBooking.failure!))
      .pipe(withDefaultErrors),
  )
  .add(
    ApiEndpoint.post("validateQuotation")`/bookings/${ApiSchema.param("bookingId", Schema.String)}/validation`
      .setPayload(Schema.Struct({ accepted: Schema.Boolean, reason: Schema.optional(Schema.String) }))
      .addSuccess(Schema.Struct({ bookingId: Schema.String, status: Schema.String }))
      .addError(businessFailure(ValidateQuotation.failure!))
      .pipe(withDefaultErrors),
  )
  .add(
    ApiEndpoint.post(
      "uploadSignedQuotation",
    )`/bookings/${ApiSchema.param("bookingId", Schema.String)}/signed-document`
      .setPayload(Schema.Struct({ fileName: Schema.String, contentBase64: Schema.String }))
      .addSuccess(Schema.Struct({ bookingId: Schema.String, status: Schema.String }))
      .addError(businessFailure(SignQuotation.failure!))
      .pipe(withDefaultErrors),
  )
  // The generated devis and the uploaded signed document, streamed from the
  // file store — the downloads the notification emails and the customer
  // area point at. Authorization rides the GetBooking query below.
  .add(
    ApiEndpoint.get("downloadQuotation")`/bookings/${ApiSchema.param("bookingId", Schema.String)}/quotation`
      .addSuccess(
        HttpApiSchema.Uint8Array({ contentType: "application/pdf" }),
      )
      .addError(businessFailure(GetBooking.failure!))
      .pipe(withDefaultErrors),
  )
  .add(
    ApiEndpoint.get(
      "downloadSignedQuotation",
    )`/bookings/${ApiSchema.param("bookingId", Schema.String)}/signed-document`
      .addSuccess(
        HttpApiSchema.Uint8Array({ contentType: "application/pdf" }),
      )
      .addError(businessFailure(GetBooking.failure!))
      .pipe(withDefaultErrors),
  )

const customers = ApiGroup.make("customers")
  .add(HttpCqrs.commandEndpoint("saveProfile", "/customers/profile", SaveProfile))
  .add(HttpCqrs.queryEndpoint("getProfile", "/customers/profile", GetProfile))

// The owner's rate card: seasonal prices per period.
const pricing = ApiGroup.make("pricing")
  .add(HttpCqrs.commandEndpoint("defineSeason", "/pricing/seasons", DefineSeason))
  .add(HttpCqrs.commandEndpoint("removeSeason", "/pricing/seasons/removal", RemoveSeason))
  .add(HttpCqrs.queryEndpoint("listSeasons", "/pricing/seasons", ListSeasons))

const session = ApiGroup.make("session").add(
  ApiEndpoint.get("me")`/me`.addSuccess(
    Schema.Struct({
      authenticated: Schema.Boolean,
      email: Schema.optional(Schema.String),
      permissions: Schema.Array(Schema.String),
    }),
  ),
)

export const appApi = Api.make("pointesavanne")
  .add(bookings)
  .add(customers)
  .add(pricing)
  .add(session)
  .add(Health.group)
  .pipe(annotate({ title: "Villa Pointe Savanne API", version: "1.0.0" }))

// ---------------------------------------------------------------------------
// Implementation. CQRS-backed endpoints go through the bridge (validation,
// authorization, idempotency and problem mapping all live on the bus); the
// two manual endpoints are the ones whose payload shape does not match the
// wire (path params, file upload).
// ---------------------------------------------------------------------------

const base64 = (encoded: string): Uint8Array => new Uint8Array(Buffer.from(encoded, "base64"))

/**
 * Streams a stored document. The quotation is currently rendered as HTML
 * (the legacy dompdf input — byte-true PDFs swap in behind the port), so the
 * content type is sniffed: real PDFs download as PDFs, the HTML interim
 * renders inline instead of serving a broken .pdf download.
 */
const documentResponse = (content: Uint8Array, fileName: string): HttpServerResponse.HttpServerResponse => {
  const isPdf =
    content.length >= 4 &&
    content[0] === 0x25 && // %
    content[1] === 0x50 && // P
    content[2] === 0x44 && // D
    content[3] === 0x46 // F
  return HttpServerResponse.uint8Array(content, {
    contentType: isPdf ? "application/pdf" : "text/html",
    headers: { "content-disposition": `inline; filename="${fileName}"` },
  })
}

const BookingsLive = HttpApiBuilder.group(appApi, "bookings", (handlers) =>
  handlers
    .handle("requestQuotation", HttpCqrs.command(RequestQuotation))
    .handle("submitQuotationLead", HttpCqrs.command(SubmitQuotationLead))
    .handle("claimQuotationLeads", ({ request }) =>
      Effect.gen(function* () {
        // The acting principal's e-mail identifies the lead to claim; it is
        // server-derived from the session, so a client cannot claim someone
        // else's pending lead.
        const user = Option.getOrUndefined(yield* Principal.current)
        const email = user?.attributes?.email
        if (typeof email !== "string" || email === "") {
          return yield* Effect.fail(
            new UnauthorizedProblem({
              error: "Unauthenticated",
              message: "a signed-in session is required to claim a quotation lead",
            }),
          )
        }
        return yield* HttpCqrs.command(ClaimQuotationLeads)({ payload: { email }, request })
      }),
    )
    .handle("listMyBookings", HttpCqrs.query(ListMyBookings))
    .handle("listAllBookings", HttpCqrs.query(ListAllBookings))
    .handle("checkAvailability", HttpCqrs.query(CheckAvailability))
    .handle("getBooking", ({ path, request }) =>
      HttpCqrs.query(GetBooking)({ payload: { bookingId: path.bookingId }, request }),
    )
    .handle("validateQuotation", ({ path, payload, request }) =>
      HttpCqrs.command(ValidateQuotation)({
        payload: { bookingId: path.bookingId, accepted: payload.accepted, reason: payload.reason },
        request,
      }),
    )
    .handle("uploadSignedQuotation", ({ path, payload, request }) =>
      Effect.gen(function* () {
        const files = yield* FileStore
        yield* files.save(signedDocumentPath(path.bookingId, payload.fileName), base64(payload.contentBase64))
        return yield* HttpCqrs.command(SignQuotation)({
          payload: { bookingId: path.bookingId, fileName: payload.fileName },
          request,
        })
      }),
    )
    .handleRaw("downloadQuotation", ({ path, request }) =>
      Effect.gen(function* () {
        // Row-level authorization rides the booking query (the owner reads
        // everything, a customer their own) — the same rule as GET /bookings/:id.
        const row = yield* HttpCqrs.query(GetBooking)({ payload: { bookingId: path.bookingId }, request })
        const files = yield* FileStore
        const content = yield* files.read(row.pdfPath ?? quotationPath(path.bookingId)).pipe(
          Effect.catchTag("FileNotFound", () =>
            Effect.fail(
              new NotFoundProblem({
                error: "NotFound",
                message: `no quotation generated for booking ${path.bookingId}`,
              }),
            ),
          ),
        )
        return documentResponse(content, "devis.pdf")
      }),
    )
    .handleRaw("downloadSignedQuotation", ({ path, request }) =>
      Effect.gen(function* () {
        const row = yield* HttpCqrs.query(GetBooking)({ payload: { bookingId: path.bookingId }, request })
        const fileName = row.signedFileName
        if (fileName === undefined) {
          return yield* Effect.fail(
            new NotFoundProblem({
              error: "NotFound",
              message: `no signed document uploaded for booking ${path.bookingId}`,
            }),
          )
        }
        const files = yield* FileStore
        const content = yield* files.read(signedDocumentPath(path.bookingId, fileName)).pipe(
          Effect.catchTag("FileNotFound", () =>
            Effect.fail(
              new NotFoundProblem({
                error: "NotFound",
                message: `signed document of booking ${path.bookingId} not found`,
              }),
            ),
          ),
        )
        return documentResponse(content, fileName)
      }),
    ),
)

const CustomersLive = HttpApiBuilder.group(appApi, "customers", (handlers) =>
  handlers
    .handle("saveProfile", HttpCqrs.command(SaveProfile))
    .handle("getProfile", HttpCqrs.query(GetProfile)),
)

const PricingLive = HttpApiBuilder.group(appApi, "pricing", (handlers) =>
  handlers
    .handle("defineSeason", HttpCqrs.command(DefineSeason))
    .handle("removeSeason", HttpCqrs.command(RemoveSeason))
    .handle("listSeasons", HttpCqrs.query(ListSeasons)),
)

/** GET /me — the session's principal and its policy-derived permissions. */
const SessionLive = HttpApiBuilder.group(appApi, "session", (handlers) =>
  handlers.handle("me", () =>
    Effect.gen(function* () {
      const authorization = yield* Authorization
      const user = Option.getOrUndefined(yield* Principal.current)
      const permissions: string[] = []
      for (const permission of authorization.policy.permissions) {
        if (yield* authorization.can(permission)) permissions.push(permission)
      }
      const email = user?.attributes?.email
      return {
        authenticated: user !== undefined && user.kind !== "anonymous",
        ...(typeof email === "string" && email !== "" ? { email } : {}),
        permissions,
      }
    }),
  ),
)

export const ApiLive = HttpApiBuilder.api(appApi).pipe(
  Layer.provide([BookingsLive, CustomersLive, PricingLive, SessionLive, Health.layer(appApi)]),
  Layer.provide(Authorization.layer(policy)),
)

// ---------------------------------------------------------------------------
// Edge middleware: the @structure-ai/auth Web handler (/auth/*) mounted in
// front of the HttpApi router, and session-cookie → Principal resolution for
// the guards below the HTTP edge.
// ---------------------------------------------------------------------------

/** Mounts the auth Web handler: requests under /auth/ never reach the api groups. */
export const AuthRoutesLive = HttpApiBuilder.middleware(
  Effect.map(AppAuthTag, ({ handler }) => (app: HttpApp.Default) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      // The request service is the (augmented) Web Request; its `url` is the
      // request path. /auth/* never reaches the api groups.
      if (!request.url.startsWith("/auth/")) return yield* app
      // The platform's request service is a wrapper; `source` is the native
      // Web Request with its body still unread.
      const source = (request as unknown as { readonly source: Request }).source
      const web = yield* Effect.tryPromise(() => handler(source)).pipe(Effect.orDie)
      return HttpServerResponse.fromWeb(web)
    }),
  ),
)

/** Session cookie → Principal on the fiber, for guards below the HTTP edge. */
export const PrincipalLive = HttpAuthorization.layer((request) => resolvePrincipal(request.headers.cookie ?? null))

/** The api with its edge middleware (auth routes + principal resolution). */
export const ApiWithMiddleware = ApiLive.pipe(
  Layer.provide(AuthRoutesLive),
  Layer.provide(PrincipalLive),
)
