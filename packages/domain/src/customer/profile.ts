import { Aggregate, DomainEvent, EntityId, ValidationFailed } from "@structure-ai/domain"
import { Effect, Schema } from "effect"

/**
 * Customer profile — the application-owned half of a customer. Credentials
 * (password, email verification, sessions) live in @structure-ai/auth; this
 * context owns the booking-relevant profile data, keyed by the auth user id.
 * The email is a denormalized copy used for booking notifications.
 */
export const CustomerId = EntityId.define("CustomerId")

export const ProfileSaved = DomainEvent.define("ProfileSaved", {
  customerId: CustomerId.schema,
  email: Schema.String,
  firstname: Schema.String,
  lastname: Schema.String,
  phoneNumber: Schema.String,
  language: Schema.optional(Schema.String),
  line1: Schema.optional(Schema.String),
  line2: Schema.optional(Schema.String),
  line3: Schema.optional(Schema.String),
})

export type ProfileEvent = typeof ProfileSaved.Type

export interface ProfileState {
  readonly saved: boolean
  readonly email?: string
  readonly firstname?: string
  readonly lastname?: string
  readonly phoneNumber?: string
  readonly language?: string
  readonly line1?: string
  readonly line2?: string
  readonly line3?: string
}

export interface ProfileInput {
  readonly email: string
  readonly firstname: string
  readonly lastname: string
  readonly phoneNumber: string
  readonly language?: string
  readonly line1?: string
  readonly line2?: string
  readonly line3?: string
}

export type ProfileCommand = { readonly _tag: "SaveProfile"; readonly id: EntityId.Of<typeof CustomerId> } & ProfileInput

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRe = /^\+?[\d\s.]{6,}$/

export const CustomerProfile = Aggregate.define<ProfileState, ProfileCommand, ProfileEvent, ValidationFailed>({
  name: "CustomerProfile",
  initial: { saved: false },
  decide: (_state, command) => {
    const issues: string[] = []
    if (!emailRe.test(command.email)) {
      issues.push("Email is not properly formatted")
    }
    // A phone number is optional (the devis form leaves it empty); when
    // provided it must be a plausible phone number.
    if (command.phoneNumber !== "" && !phoneRe.test(command.phoneNumber)) {
      issues.push("Phone number is not valid")
    }
    if (issues.length > 0) {
      return Effect.fail(new ValidationFailed({ subject: "profile", issues }))
    }
    return Effect.succeed([
      ProfileSaved.make({
        customerId: command.id,
        email: command.email,
        firstname: command.firstname,
        lastname: command.lastname,
        phoneNumber: command.phoneNumber,
        ...(command.language !== undefined && { language: command.language }),
        ...(command.line1 !== undefined && { line1: command.line1 }),
        ...(command.line2 !== undefined && { line2: command.line2 }),
        ...(command.line3 !== undefined && { line3: command.line3 }),
      }),
    ])
  },
  evolve: (state, event) =>
    event._tag === "ProfileSaved"
      ? {
          saved: true,
          email: event.email,
          firstname: event.firstname,
          lastname: event.lastname,
          phoneNumber: event.phoneNumber,
          language: event.language,
          line1: event.line1,
          line2: event.line2,
          line3: event.line3,
        }
      : state,
})

export const profileEventRegistryEntries = [{ schema: ProfileSaved, schemaVersion: 1 }]
