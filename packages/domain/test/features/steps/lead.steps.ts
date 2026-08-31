import { Given, Then, When, type StepContext } from "@structure-ai/bdd"
import { Cause, Effect, Exit } from "effect"
import type { DomainWorld } from "../../composition.ts"
import {
  ClaimQuotationLeads,
  GetProfile,
  SubmitQuotationLead,
  type ClaimQuotationLeadsSuccess,
} from "../../../src/messages/index.ts"
import { installVilla, registerCustomer, ddMmYyyyToIso, norm } from "./support.ts"
import { formatEuros } from "../../../src/booking/pricing.ts"

/**
 * The quotation-lead funnel steps: an anonymous visitor submits a devis
 * intent, registers, and the claim at sign-in converts the pending lead
 * into a profile (when absent) and a quotation request.
 */

type Ctx<P extends readonly unknown[]> = StepContext<DomainWorld, P>

/** The lead contact the `Given` steps accumulate (one visitor per scenario). */
interface LeadContact {
  readonly email: string
  readonly firstname: string
  readonly lastname: string
  readonly phoneNumber: string
}

const submitLead = (
  world: DomainWorld,
  contact: LeadContact,
  from: string,
  to: string,
  adults: number,
  message?: string,
): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    installVilla(world)
    const exit = yield* world.dispatch(
      SubmitQuotationLead,
      {
        email: contact.email,
        firstname: contact.firstname,
        lastname: contact.lastname,
        phoneNumber: contact.phoneNumber,
        villaId: "villa-de-standing-pointe-savanne",
        from: ddMmYyyyToIso(from),
        to: ddMmYyyyToIso(to),
        adultsCount: adults,
        ...(message !== undefined ? { message } : {}),
      },
      // Anonymous: a lead is exactly the intent a visitor without a session
      // expresses. (The HTTP-level test exercises the real policy stack.)
    )
    world.expectSuccess()
    if (Exit.isFailure(exit)) {
      return yield* Effect.die(`lead submission failed: ${String(Cause.squash(exit.cause))}`)
    }
  })

// ---

export const leadSteps = [
  // --- givens ------------------------------------------------------------------

  Given(
    'a visitor {string} named {string} {string} with phone {string}',
    ({ world, params }: Ctx<readonly [string, string, string, string]>) => {
      const [email, firstname, lastname, phoneNumber] = params
      world.leadContact = { email, firstname, lastname, phoneNumber }
    },
  ),

  Given('the visitor submits a quotation lead from {string} to {string} for {int} adults', ({ world, params }: Ctx<readonly [string, string, number]>) => {
    const [from, to, adults] = params
    return submitLead(world, world.leadContact!, from, to, adults)
  }),

  Given('the visitor submits a quotation lead from {string} to {string} for {int} adults with message {string}', ({ world, params }: Ctx<readonly [string, string, number, string]>) => {
    const [from, to, adults, message] = params
    return submitLead(world, world.leadContact!, from, to, adults, message)
  }),

  Given('{string} registers and signs in', ({ world, params }: Ctx<readonly [string]>): Effect.Effect<void, Error> => {
    const [email] = params
    const contact = world.leadContact?.email === email ? world.leadContact : undefined
    return registerCustomer(world, {
      email,
      password: "long-enough-pass",
      phoneNumber: contact?.phoneNumber ?? "0601020304",
      firstname: contact?.firstname ?? email.split("@")[0]!,
      lastname: contact?.lastname ?? "Visitor",
    })
  }),

  // --- when --------------------------------------------------------------------

  When('the quotation leads are claimed for {string}', ({ world, params }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const [email] = params
      const customer = world.actorNamed(email)
      if (customer === undefined) return yield* Effect.die(`${email} must be registered`)
      world.emailCountMark = world.doubles.mails.length
      const exit = yield* world.dispatch(ClaimQuotationLeads, { email }, { actor: customer.id })
      if (Exit.isSuccess(exit)) {
        world.leadClaim = exit.value
        const booking = exit.value.bookings[0]
        if (booking !== undefined) {
          world.quotationResult = { bookingId: booking.bookingId, status: booking.status, pricing: booking.pricing }
          world.quotationOwnerId = customer.id
        }
        yield* world.runWorkers()
      }
    }),
  ),

  // --- thens -------------------------------------------------------------------

  Then('the lead should be converted to one booking with a total amount of {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [total] = params
    const claim = world.leadClaim
    if (claim === undefined) throw new Error("a claim should have succeeded")
    if (claim.claimed !== 1) throw new Error(`expected 1 claimed lead, got ${claim.claimed}`)
    if (claim.bookings.length !== 1) throw new Error(`expected 1 booking, got ${claim.bookings.length} (issues: ${claim.issues.join("; ")})`)
    world.expectSuccess()
    const pricing = world.quotationResult?.pricing
    if (pricing === undefined) throw new Error("a quotation result should exist")
    const actual = formatEuros(pricing.totalAmount)
    if (norm(actual) !== norm(total)) throw new Error(`expected total ${norm(total)}, got ${norm(actual)}`)
  }),

  Then('no booking should be created by the claim', ({ world }: Ctx<readonly []>) => {
    const claim = world.leadClaim
    if (claim === undefined) throw new Error("a claim should have succeeded")
    if (claim.bookings.length !== 0) throw new Error(`expected no booking, got ${claim.bookings.length}`)
  }),

  Then('the claim should report the issue {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [issue] = params
    const claim = world.leadClaim
    if (claim === undefined) throw new Error("a claim should have succeeded")
    if (!claim.issues.some((reported) => reported === issue)) {
      throw new Error(`expected issue "${issue}", got: ${claim.issues.join("; ")}`)
    }
  }),

  Then('the profile of {string} should read {string}, {string}, {string}', ({ world, params }: Ctx<readonly [string, string, string, string]>) =>
    Effect.gen(function* () {
      const [email, firstname, lastname, phoneNumber] = params
      const customer = world.actorNamed(email)
      if (customer === undefined) return yield* Effect.die(`${email} must be registered`)
      const exit = yield* world.query(GetProfile, {}, { actor: customer.id })
      if (Exit.isFailure(exit)) return yield* Effect.die(`GetProfile failed: ${String(Cause.squash(exit.cause))}`)
      const profile = exit.value.profile
      if (profile === null) return yield* Effect.die(`expected a saved profile for ${email}`)
      if (profile.firstname !== firstname || profile.lastname !== lastname || profile.phoneNumber !== phoneNumber) {
        return yield* Effect.die(
          `expected "${firstname}", "${lastname}", "${phoneNumber}", got "${profile.firstname}", "${profile.lastname}", "${profile.phoneNumber}"`,
        )
      }
    }),
  ),

  Then('the admin email should quote the visitor\'s message {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [message] = params
    const toAdmin = world.doubles.mails.filter((mail) => mail.to === world.doubles.config.adminMail)
    if (!toAdmin.some((mail) => mail.body.includes(message))) {
      throw new Error(
        `no admin email quotes "${message}":\n${world.doubles.mails.map((m) => `- ${m.to}: ${m.subject}`).join("\n")}`,
      )
    }
  }),
]
