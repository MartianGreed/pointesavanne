import { Condition, CqrsAuthorization, Policy, Principal } from "@structure-ai/authorization"
import type { Effect } from "effect"
import {
  CheckAvailability,
  ClaimQuotationLeads,
  DefineSeason,
  GenerateQuotation,
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
} from "./messages/index.ts"

/**
 * Access rules: customers manage their own profile and bookings; the villa
 * owner (emails listed in OWNER_EMAILS) additionally reviews every quotation,
 * validates signed ones and manages the rate card. Fail closed: unmapped
 * messages are denied.
 */
export const policy = Policy.define({
  resources: {
    booking: ["request", "generate", "read-own", "list-own", "sign", "read-all", "validate"],
    profile: ["read", "save"],
    lead: ["submit", "claim"],
    pricing: ["manage"],
  },
  conditions: {
    owner: Condition.owner(),
  },
  roles: {
    customer: {
      grants: [
        "booking:request",
        "booking:list-own",
        "booking:sign",
        "lead:claim",
        "profile:read",
        "profile:save",
        { permission: "booking:read-own", when: "owner" },
      ],
    },
    owner: {
      inherits: ["customer"],
      grants: ["booking:read-all", "booking:validate", "pricing:manage"],
    },
    /** Internal actor dispatching the quotation generation job. */
    system: { grants: ["booking:generate"] },
  },
})

export const TENANT_ID = "pointesavanne" as const

/** Runs an effect as the internal system principal (background jobs). */
export const asSystem = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Principal.within({ id: "quotation-generator", roles: ["system"], kind: "service" })(effect)

/**
 * The bus authorizer: maps every message to its permission and layers the
 * policy rules over it. Fail closed — unmapped messages are denied.
 */
export const AuthorizerLive = CqrsAuthorization.rules(policy)
  .message(RequestQuotation, "booking:request")
  .message(SignQuotation, "booking:sign")
  .message(ValidateQuotation, "booking:validate")
  .message(GenerateQuotation, "booking:generate")
  .message(GetBooking, "booking:list-own")
  .message(ListMyBookings, "booking:list-own")
  .message(ListAllBookings, "booking:read-all")
  .message(SaveProfile, "profile:save")
  .message(GetProfile, "profile:read")
  .message(ClaimQuotationLeads, "lead:claim")
  .message(DefineSeason, "pricing:manage")
  .message(RemoveSeason, "pricing:manage")
  .message(ListSeasons, "pricing:manage")
  // The public funnel: anyone may ask for a devis (the lead is claimed only
  // by the verified owner of that e-mail, at sign-in).
  .public(CheckAvailability)
  .public(SubmitQuotationLead)
  .layer
