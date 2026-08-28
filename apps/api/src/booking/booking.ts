import { Aggregate, DomainEvent, EntityId, InvariantViolation, ValidationFailed } from "@structure-ai/domain"
import { Effect, Schema } from "effect"
import { computeQuotation, dates, type QuotationPricing, type VillaPricing } from "./pricing.ts"

export const BookingId = EntityId.define("BookingId")

export const bookingStatuses = [
  "quotation-requested",
  "quotation-awaiting-acceptation",
  "quotation-signed",
  "contract-sent",
] as const
export type BookingStatus = (typeof bookingStatuses)[number]

const PricingSchema = Schema.Struct({
  totalAmount: Schema.Number,
  unrankedTouristTax: Schema.Number,
  rankedTouristTax: Schema.Number,
  depositAmount: Schema.Number,
  householdAmount: Schema.Number,
})
export type PricingSnapshot = typeof PricingSchema.Type

export const BookingRequested = DomainEvent.define("BookingRequested", {
  bookingId: BookingId.schema,
  customerId: Schema.String,
  villaId: Schema.String,
  villaName: Schema.String,
  from: Schema.String,
  to: Schema.String,
  adultsCount: Schema.Number,
  childrenCount: Schema.Number,
  nights: Schema.Number,
  pricing: PricingSchema,
})

export const QuotationGenerated = DomainEvent.define("QuotationGenerated", {
  bookingId: BookingId.schema,
  pdfPath: Schema.String,
})

export const QuotationSigned = DomainEvent.define("QuotationSigned", {
  bookingId: BookingId.schema,
  fileName: Schema.String,
})

export const QuotationValidated = DomainEvent.define("QuotationValidated", {
  bookingId: BookingId.schema,
  validatedBy: Schema.String,
})

export const QuotationRejected = DomainEvent.define("QuotationRejected", {
  bookingId: BookingId.schema,
  reason: Schema.String,
  validatedBy: Schema.String,
})

export type BookingEvent =
  | typeof BookingRequested.Type
  | typeof QuotationGenerated.Type
  | typeof QuotationSigned.Type
  | typeof QuotationValidated.Type
  | typeof QuotationRejected.Type

export interface BookingState {
  readonly status: BookingStatus | "none"
  readonly customerId?: string
  readonly villaId?: string
  readonly villaName?: string
  readonly from?: string
  readonly to?: string
  readonly adultsCount?: number
  readonly childrenCount?: number
  readonly nights?: number
  readonly pricing?: PricingSnapshot
  readonly pdfPath?: string
  readonly signedFileName?: string
}

export type BookingCommand =
  | {
      readonly _tag: "RequestBooking"
      readonly id: EntityId.Of<typeof BookingId>
      readonly customerId: string
      readonly villa: VillaPricing
      readonly from: string
      readonly to: string
      readonly adultsCount: number
      readonly childrenCount: number
    }
  | {
      readonly _tag: "GenerateQuotation"
      readonly id: EntityId.Of<typeof BookingId>
      readonly pdfPath: string
    }
  | {
      readonly _tag: "SignQuotation"
      readonly id: EntityId.Of<typeof BookingId>
      readonly fileName: string
    }
  | {
      readonly _tag: "ValidateQuotation"
      readonly id: EntityId.Of<typeof BookingId>
      readonly accepted: boolean
      readonly reason?: string
      readonly validatedBy: string
    }

const datesAreValid = (from: string, to: string): boolean =>
  dates.isBefore(dates.parse(from), dates.parse(to))

export const Booking = Aggregate.define<BookingState, BookingCommand, BookingEvent, ValidationFailed | InvariantViolation>({
  name: "Booking",
  initial: { status: "none" },
  decide: (state, command) => {
    switch (command._tag) {
      case "RequestBooking": {
        if (state.status !== "none") {
          return Effect.fail(new InvariantViolation({ rule: `booking ${command.id} already exists` }))
        }
        if (!datesAreValid(command.from, command.to)) {
          return Effect.fail(
            new ValidationFailed({
              subject: "booking",
              issues: [
                `End date ${dates.format(dates.parse(command.to))} cannot be before start date ${dates.format(dates.parse(command.from))}`,
              ],
            }),
          )
        }
        let pricing: QuotationPricing
        try {
          pricing = computeQuotation(
            command.villa,
            command.from,
            command.to,
            command.adultsCount,
            command.childrenCount,
          )
        } catch (cause) {
          return Effect.fail(new ValidationFailed({ subject: "booking", issues: [String(cause)] }))
        }
        return Effect.succeed([
          BookingRequested.make({
            bookingId: command.id,
            customerId: command.customerId,
            villaId: command.villa.villaId,
            villaName: command.villa.name,
            from: command.from,
            to: command.to,
            adultsCount: command.adultsCount,
            childrenCount: command.childrenCount,
            nights: dates.daysBetween(dates.parse(command.from), dates.parse(command.to)),
            pricing,
          }),
        ])
      }
      case "GenerateQuotation": {
        if (state.status !== "quotation-requested") {
          return Effect.fail(
            new InvariantViolation({
              rule: `quotation generation requires status "quotation-requested", got "${state.status}"`,
            }),
          )
        }
        return Effect.succeed([QuotationGenerated.make({ bookingId: command.id, pdfPath: command.pdfPath })])
      }
      case "SignQuotation": {
        if (state.status !== "quotation-awaiting-acceptation") {
          return Effect.fail(
            new InvariantViolation({
              rule: `signing requires status "quotation-awaiting-acceptation", got "${state.status}"`,
            }),
          )
        }
        return Effect.succeed([QuotationSigned.make({ bookingId: command.id, fileName: command.fileName })])
      }
      case "ValidateQuotation": {
        if (state.status !== "quotation-signed") {
          return Effect.fail(
            new InvariantViolation({
              rule: `validation requires status "quotation-signed", got "${state.status}"`,
            }),
          )
        }
        return Effect.succeed(
          command.accepted
            ? [QuotationValidated.make({ bookingId: command.id, validatedBy: command.validatedBy })]
            : [
                QuotationRejected.make({
                  bookingId: command.id,
                  reason: command.reason ?? "",
                  validatedBy: command.validatedBy,
                }),
              ],
        )
      }
    }
  },
  evolve: (state, event) => {
    switch (event._tag) {
      case "BookingRequested":
        return {
          status: "quotation-requested" as const,
          customerId: event.customerId,
          villaId: event.villaId,
          villaName: event.villaName,
          from: event.from,
          to: event.to,
          adultsCount: event.adultsCount,
          childrenCount: event.childrenCount,
          nights: event.nights,
          pricing: event.pricing,
        }
      case "QuotationGenerated":
        return { ...state, status: "quotation-awaiting-acceptation" as const, pdfPath: event.pdfPath }
      case "QuotationSigned":
        return { ...state, status: "quotation-signed" as const, signedFileName: event.fileName }
      case "QuotationValidated":
        return { ...state, status: "contract-sent" as const }
      case "QuotationRejected":
        return state
    }
  },
})

export const eventRegistryEntries = [
  { schema: BookingRequested, schemaVersion: 1 },
  { schema: QuotationGenerated, schemaVersion: 1 },
  { schema: QuotationSigned, schemaVersion: 1 },
  { schema: QuotationValidated, schemaVersion: 1 },
  { schema: QuotationRejected, schemaVersion: 1 },
]
