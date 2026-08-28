import { Command, Query } from "@structure-ai/cqrs"
import { Schema } from "effect"
import { bookingStatuses } from "../booking/booking.ts"

/**
 * The message contracts of the application. Commands are intent-named and
 * validated at the boundary (shape only); business rules live in the
 * aggregates' `decide`. Queries read view models and never mutate.
 */

const isoDay = Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/))
const count = Schema.Number.pipe(Schema.int(), Schema.nonNegative())
const money = Schema.Number.pipe(Schema.nonNegative())

/** Every business failure a handler may report; infra defects die instead. */
export const AppFailure = Schema.Union(
  Schema.TaggedStruct("ValidationFailed", {
    subject: Schema.String,
    issues: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("NotFound", { entity: Schema.String, id: Schema.String }),
  Schema.TaggedStruct("InvariantViolation", { rule: Schema.String, details: Schema.optional(Schema.String) }),
  Schema.TaggedStruct("ConcurrencyConflict", {
    entity: Schema.String,
    id: Schema.String,
    expectedVersion: Schema.Number,
    actualVersion: Schema.Number,
  }),
)
export const NotFoundFailure = Schema.TaggedStruct("NotFound", { entity: Schema.String, id: Schema.String })

/** Row-level authorization outcome (401/403 problems at the HTTP edge). */
export const AccessFailure = Schema.Union(
  Schema.TaggedStruct("Unauthenticated", {
    permission: Schema.optional(Schema.String),
    reason: Schema.optional(Schema.String),
  }),
  Schema.TaggedStruct("PermissionDenied", {
    permission: Schema.String,
    principal: Schema.String,
    scope: Schema.optional(Schema.String),
    reason: Schema.optional(Schema.String),
  }),
)

export const PricingSummary = Schema.Struct({
  totalAmount: money,
  unrankedTouristTax: money,
  rankedTouristTax: money,
  depositAmount: money,
  householdAmount: money,
})

export const BookingRow = Schema.Struct({
  bookingId: Schema.String,
  customerId: Schema.String,
  status: Schema.Literal(...bookingStatuses),
  villaId: Schema.String,
  villaName: Schema.String,
  from: isoDay,
  to: isoDay,
  adultsCount: count,
  childrenCount: count,
  nights: count,
  totalAmount: money,
  unrankedTouristTax: money,
  rankedTouristTax: money,
  depositAmount: money,
  householdAmount: money,
  pdfPath: Schema.optional(Schema.String),
  signedFileName: Schema.optional(Schema.String),
})
export type BookingRowType = typeof BookingRow.Type

export const ProfileRow = Schema.Struct({
  customerId: Schema.String,
  email: Schema.String,
  firstname: Schema.String,
  lastname: Schema.String,
  phoneNumber: Schema.String,
  language: Schema.optional(Schema.String),
  line1: Schema.optional(Schema.String),
  line2: Schema.optional(Schema.String),
  line3: Schema.optional(Schema.String),
})
export type ProfileRowType = typeof ProfileRow.Type

// --- booking commands -------------------------------------------------------

export const RequestQuotation = Command.define("RequestQuotation", {
  payload: Schema.Struct({
    villaId: Schema.String,
    from: isoDay,
    to: isoDay,
    adultsCount: count.pipe(Schema.positive()),
    childrenCount: Schema.optionalWith(count, { default: () => 0 }),
  }),
  success: Schema.Struct({
    bookingId: Schema.String,
    status: Schema.Literal(...bookingStatuses),
    pricing: PricingSummary,
  }),
  failure: AppFailure,
})

export const GenerateQuotation = Command.define("GenerateQuotation", {
  payload: Schema.Struct({ bookingId: Schema.String }),
  success: Schema.Struct({ bookingId: Schema.String, status: Schema.Literal(...bookingStatuses), pdfPath: Schema.String }),
  failure: AppFailure,
})

export const SignQuotation = Command.define("SignQuotation", {
  payload: Schema.Struct({ bookingId: Schema.String, fileName: Schema.String }),
  success: Schema.Struct({ bookingId: Schema.String, status: Schema.Literal(...bookingStatuses) }),
  failure: AppFailure,
})

export const ValidateQuotation = Command.define("ValidateQuotation", {
  payload: Schema.Struct({
    bookingId: Schema.String,
    accepted: Schema.Boolean,
    reason: Schema.optional(Schema.String),
  }),
  success: Schema.Struct({ bookingId: Schema.String, status: Schema.Literal(...bookingStatuses) }),
  failure: AppFailure,
})

// --- booking queries --------------------------------------------------------

export const GetBooking = Query.define("GetBooking", {
  payload: Schema.Struct({ bookingId: Schema.String }),
  success: BookingRow,
  failure: Schema.Union(NotFoundFailure, AccessFailure),
})

export const ListMyBookings = Query.define("ListMyBookings", {
  payload: Schema.Struct({}),
  success: Schema.Struct({ items: Schema.Array(BookingRow) }),
  failure: NotFoundFailure,
})

export const ListAllBookings = Query.define("ListAllBookings", {
  payload: Schema.Struct({ status: Schema.optional(Schema.String) }),
  success: Schema.Struct({ items: Schema.Array(BookingRow) }),
  failure: NotFoundFailure,
})

export const CheckAvailability = Query.define("CheckAvailability", {
  payload: Schema.Struct({ villaId: Schema.String, from: isoDay, to: isoDay }),
  success: Schema.Struct({ available: Schema.Boolean }),
  failure: NotFoundFailure,
})

// --- profile ----------------------------------------------------------------

export const SaveProfile = Command.define("SaveProfile", {
  payload: Schema.Struct({
    email: Schema.String,
    firstname: Schema.String,
    lastname: Schema.String,
    phoneNumber: Schema.String,
    language: Schema.optional(Schema.String),
    line1: Schema.optional(Schema.String),
    line2: Schema.optional(Schema.String),
    line3: Schema.optional(Schema.String),
  }),
  success: ProfileRow,
  failure: AppFailure,
})

export const GetProfile = Query.define("GetProfile", {
  payload: Schema.Struct({}),
  success: Schema.Struct({ profile: Schema.NullOr(ProfileRow) }),
  failure: NotFoundFailure,
})
