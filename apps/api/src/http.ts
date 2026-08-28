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
import { CommandBus, QueryBus } from "@structure-ai/cqrs"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect, Layer, Schema } from "effect"
import { FileStore } from "./infra.ts"
import {
  BookingRow,
  CheckAvailability,
  GetBooking,
  GetProfile,
  ListAllBookings,
  ListMyBookings,
  RequestQuotation,
  SaveProfile,
  SignQuotation,
  ValidateQuotation,
} from "./messages/index.ts"

// ---------------------------------------------------------------------------
// API declaration — the OpenAPI contract is generated from this.
// ---------------------------------------------------------------------------

const bookings = ApiGroup.make("bookings")
  .add(HttpCqrs.commandEndpoint("requestQuotation", "/bookings/quotation", RequestQuotation))
  .add(HttpCqrs.queryEndpoint("listMyBookings", "/bookings/my", ListMyBookings))
  .add(HttpCqrs.queryEndpoint("listAllBookings", "/bookings", ListAllBookings))
  .add(HttpCqrs.queryEndpoint("checkAvailability", "/bookings/availability", CheckAvailability))
  .add(
    ApiEndpoint.get("getBooking")`/bookings/${ApiSchema.param("bookingId", Schema.String)}`
      .addSuccess(BookingRow)
      .pipe(withDefaultErrors),
  )
  .add(
    ApiEndpoint.post("validateQuotation")`/bookings/${ApiSchema.param("bookingId", Schema.String)}/validation`
      .setPayload(Schema.Struct({ accepted: Schema.Boolean, reason: Schema.optional(Schema.String) }))
      .addSuccess(Schema.Struct({ bookingId: Schema.String, status: Schema.String }))
      .pipe(withDefaultErrors),
  )
  .add(
    ApiEndpoint.post(
      "uploadSignedQuotation",
    )`/bookings/${ApiSchema.param("bookingId", Schema.String)}/signed-document`
      .setPayload(Schema.Struct({ fileName: Schema.String, contentBase64: Schema.String }))
      .addSuccess(Schema.Struct({ bookingId: Schema.String, status: Schema.String }))
      .pipe(withDefaultErrors),
  )

const customers = ApiGroup.make("customers")
  .add(HttpCqrs.commandEndpoint("saveProfile", "/customers/profile", SaveProfile))
  .add(HttpCqrs.queryEndpoint("getProfile", "/customers/profile", GetProfile))

export const appApi = Api.make("pointesavanne")
  .add(bookings)
  .add(customers)
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

export const ApiLive = HttpApiBuilder.api(appApi).pipe(
  Layer.provide([BookingsLive, CustomersLive, Health.layer(appApi)]),
)

export { CommandBus, QueryBus, Docs }
