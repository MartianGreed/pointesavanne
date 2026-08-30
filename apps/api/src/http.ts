import {
  annotate,
  Api,
  ApiEndpoint,
  ApiGroup,
  ApiSchema,
  Docs,
  Health,
  HttpCqrs,
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
  FileStore,
  GetBooking,
  GetProfile,
  ListAllBookings,
  ListMyBookings,
  RequestQuotation,
  SaveProfile,
  SignQuotation,
  ValidateQuotation,
  policy,
  resolvePrincipal,
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

const customers = ApiGroup.make("customers")
  .add(HttpCqrs.commandEndpoint("saveProfile", "/customers/profile", SaveProfile))
  .add(HttpCqrs.queryEndpoint("getProfile", "/customers/profile", GetProfile))

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

const BookingsLive = HttpApiBuilder.group(appApi, "bookings", (handlers) =>
  handlers
    .handle("requestQuotation", HttpCqrs.command(RequestQuotation))
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
        yield* files.save(`booking/${path.bookingId}/signed/${payload.fileName}`, base64(payload.contentBase64))
        return yield* HttpCqrs.command(SignQuotation)({
          payload: { bookingId: path.bookingId, fileName: payload.fileName },
          request,
        })
      }),
    ),
)

const CustomersLive = HttpApiBuilder.group(appApi, "customers", (handlers) =>
  handlers
    .handle("saveProfile", HttpCqrs.command(SaveProfile))
    .handle("getProfile", HttpCqrs.query(GetProfile)),
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
  Layer.provide([BookingsLive, CustomersLive, SessionLive, Health.layer(appApi)]),
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
