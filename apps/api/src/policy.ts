import { Condition, Policy } from "@structure-ai/authorization"

/**
 * Access rules: customers manage their own profile and bookings; the villa
 * owner (emails listed in OWNER_EMAILS) additionally reviews every quotation
 * and validates signed ones. Fail closed: unmapped messages are denied.
 */
export const policy = Policy.define({
  resources: {
    booking: ["request", "generate", "read-own", "list-own", "sign", "read-all", "validate"],
    profile: ["read", "save"],
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
        "profile:read",
        "profile:save",
        { permission: "booking:read-own", when: "owner" },
      ],
    },
    owner: {
      inherits: ["customer"],
      grants: ["booking:read-all", "booking:validate"],
    },
    /** Internal actor dispatching the quotation generation job. */
    system: { grants: ["booking:generate"] },
  },
})

export const TENANT_ID = "pointesavanne" as const

import { Principal } from "@structure-ai/authorization"
import type { Effect } from "effect"

/** Runs an effect as the internal system principal (background jobs). */
export const asSystem = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Principal.within({ id: "quotation-generator", roles: ["system"], kind: "service" })(effect)
