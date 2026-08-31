import { Aggregate, DomainEvent, EntityId, InvariantViolation } from "@structure-ai/domain"
import { Effect, Schema } from "effect"

/**
 * Quotation lead — the funnel intent of a visitor who asked for a devis
 * before (or without) having an account. The backend is the source of truth
 * for this pending intent: it must survive the e-mail-verification
 * round-trip of registration, which no client-side state can.
 *
 * Identity is deterministic — the normalized e-mail — so "at most one
 * unclaimed lead per e-mail" falls out of the stream identity: a newer
 * submission simply succeeds the previous one on the same stream, and the
 * claim step loads the lead without any read model. Claimed leads keep
 * their event trail for funnel auditing.
 */
export const LeadId = EntityId.define("LeadId")

/** `lead:<normalized e-mail>` — stable, collision-free stream id. */
export const leadIdOf = (email: string): EntityId.Of<typeof LeadId> => LeadId.make(`lead:${email.trim().toLowerCase()}`)

export const LeadSubmitted = DomainEvent.define("LeadSubmitted", {
  leadId: LeadId.schema,
  email: Schema.String,
  firstname: Schema.String,
  lastname: Schema.String,
  phoneNumber: Schema.String,
  villaId: Schema.String,
  from: Schema.String,
  to: Schema.String,
  adultsCount: Schema.Number,
  childrenCount: Schema.Number,
  message: Schema.optional(Schema.String),
})

export const LeadClaimed = DomainEvent.define("LeadClaimed", {
  leadId: LeadId.schema,
  customerId: Schema.String,
  bookingId: Schema.optional(Schema.String),
  note: Schema.optional(Schema.String),
})

export type LeadEvent = typeof LeadSubmitted.Type | typeof LeadClaimed.Type

export interface LeadState {
  readonly status: "none" | "submitted" | "claimed"
  readonly email?: string
  readonly firstname?: string
  readonly lastname?: string
  readonly phoneNumber?: string
  readonly villaId?: string
  readonly from?: string
  readonly to?: string
  readonly adultsCount?: number
  readonly childrenCount?: number
  readonly message?: string
  readonly claimedBy?: string
}

export type LeadCommand =
  | {
      readonly _tag: "SubmitLead"
      readonly id: EntityId.Of<typeof LeadId>
      readonly email: string
      readonly firstname: string
      readonly lastname: string
      readonly phoneNumber: string
      readonly villaId: string
      readonly from: string
      readonly to: string
      readonly adultsCount: number
      readonly childrenCount: number
      readonly message?: string
    }
  | {
      readonly _tag: "ClaimLead"
      readonly id: EntityId.Of<typeof LeadId>
      readonly customerId: string
      readonly bookingId?: string
      readonly note?: string
    }

export const QuotationLead = Aggregate.define<LeadState, LeadCommand, LeadEvent, InvariantViolation>({
  name: "QuotationLead",
  initial: { status: "none" },
  decide: (state, command) => {
    switch (command._tag) {
      // A fresh intent always supersedes a pending one (the freshest intent
      // wins, the funnel's agreed priority rule); a claimed lead may also be
      // re-submitted — the visitor came back for a new devis.
      case "SubmitLead":
        return Effect.succeed([
          LeadSubmitted.make({
            leadId: command.id,
            email: command.email,
            firstname: command.firstname,
            lastname: command.lastname,
            phoneNumber: command.phoneNumber,
            villaId: command.villaId,
            from: command.from,
            to: command.to,
            adultsCount: command.adultsCount,
            childrenCount: command.childrenCount,
            ...(command.message !== undefined && command.message !== "" ? { message: command.message } : {}),
          }),
        ])
      case "ClaimLead": {
        if (state.status !== "submitted") {
          return Effect.fail(
            new InvariantViolation({
              rule: `claiming requires a submitted lead, got "${state.status}"`,
            }),
          )
        }
        return Effect.succeed([
          LeadClaimed.make({
            leadId: command.id,
            customerId: command.customerId,
            ...(command.bookingId !== undefined && { bookingId: command.bookingId }),
            ...(command.note !== undefined && command.note !== "" ? { note: command.note } : {}),
          }),
        ])
      }
    }
  },
  evolve: (state, event) => {
    switch (event._tag) {
      case "LeadSubmitted":
        return {
          status: "submitted" as const,
          email: event.email,
          firstname: event.firstname,
          lastname: event.lastname,
          phoneNumber: event.phoneNumber,
          villaId: event.villaId,
          from: event.from,
          to: event.to,
          adultsCount: event.adultsCount,
          childrenCount: event.childrenCount,
          message: event.message,
        }
      case "LeadClaimed":
        return { ...state, status: "claimed" as const, claimedBy: event.customerId }
    }
  },
})

export const leadEventRegistryEntries = [
  { schema: LeadSubmitted, schemaVersion: 1 },
  { schema: LeadClaimed, schemaVersion: 1 },
]
