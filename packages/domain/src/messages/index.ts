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
const emailShape = Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))

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
    message: Schema.optional(Schema.String),
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

// --- quotation leads --------------------------------------------------------

/** The booking request a converted lead produced (same shape as RequestQuotation's success). */
export const ClaimedBooking = Schema.Struct({
  bookingId: Schema.String,
  status: Schema.Literal(...bookingStatuses),
  pricing: PricingSummary,
})

export const ClaimQuotationLeadsSuccess = Schema.Struct({
  /** How many pending leads were converted (0 or 1 — one lead per e-mail). */
  claimed: Schema.Number,
  bookings: Schema.Array(ClaimedBooking),
  /** Why a claimed lead produced no booking (e.g. dates since taken). */
  issues: Schema.Array(Schema.String),
})
export type ClaimQuotationLeadsSuccessType = typeof ClaimQuotationLeadsSuccess.Type

/**
 * The anonymous funnel entry: a visitor asks for a devis before having an
 * account. The lead is the backend's record of that intent — the claim,
 * after sign-in, turns it into a real quotation request.
 */
export const SubmitQuotationLead = Command.define("SubmitQuotationLead", {
  payload: Schema.Struct({
    email: emailShape,
    firstname: Schema.String,
    lastname: Schema.String,
    phoneNumber: Schema.String,
    villaId: Schema.String,
    from: isoDay,
    to: isoDay,
    adultsCount: count.pipe(Schema.positive()),
    childrenCount: Schema.optionalWith(count, { default: () => 0 }),
    message: Schema.optional(Schema.String),
  }),
  success: Schema.Struct({ leadId: Schema.String, status: Schema.Literal("submitted") }),
  failure: AppFailure,
})

/**
 * Converts the pending lead of the acting customer's e-mail into a saved
 * profile (when absent) and a quotation request. The e-mail is derived from
 * the session at the HTTP edge — the client never supplies it.
 */
export const ClaimQuotationLeads = Command.define("ClaimQuotationLeads", {
  payload: Schema.Struct({ email: emailShape }),
  success: ClaimQuotationLeadsSuccess,
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
