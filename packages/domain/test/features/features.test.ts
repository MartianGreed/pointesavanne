import { defineFeatureSuite } from "@structure-ai/bdd"
import { buildWorld, type DomainWorld, type WorldServices } from "../composition.ts"
import { bookingSteps } from "./steps/booking.steps.ts"
import { customerSteps } from "./steps/customer.steps.ts"
import { leadSteps } from "./steps/lead.steps.ts"

/**
 * The feature suite: compiles every `.feature` file into ordinary `bun test`
 * cases. One fresh world per scenario (built inside the suite-owned scope);
 * eventual consistency stays under the steps' control — the scenarios assert
 * observable mail counts per business transition, so the workers are drained
 * exactly where the business narrative says the messages are handled.
 */
defineFeatureSuite<DomainWorld, WorldServices>({
  features: "test/features/**/*.feature",
  makeWorld: buildWorld,
  steps: [...bookingSteps, ...customerSteps, ...leadSteps],
})
