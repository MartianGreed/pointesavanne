import { Given, Then, When, type StepContext, ddMmYyyyToIso, norm } from "@structure-ai/bdd"
import { Principal } from "@structure-ai/authorization"
import { Cause, Effect, Exit, Schema } from "effect"
import type { DomainWorld } from "../../composition.ts"
import { GetBooking, SignQuotation } from "../../../src/messages/index.ts"
import { formatEuros, parsePrice } from "../../../src/booking/pricing.ts"
import { quotationPath } from "../../../src/infra.ts"
import { registerCustomer, submitQuotation } from "./support.ts"

/** Handler context with the world and the expression's parameter tuple. */
type Ctx<P extends readonly unknown[]> = StepContext<DomainWorld, P>

const discountRow = Schema.Struct({
  from: Schema.NumberFromString,
  to: Schema.NumberFromString,
  discountAmount: Schema.String,
})

const pricingRow = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  baseAmount: Schema.String,
})

const bookedRow = Schema.Struct({
  customer: Schema.String,
  from: Schema.String,
  to: Schema.String,
  adults: Schema.NumberFromString,
  children: Schema.NumberFromString,
})

export const bookingSteps = [
  // --- givens: villa, pricing, discounts ------------------------------------

  Given(
    'a villa {string} with a caution amount of {string} and the mandatory household of {string}',
    ({ world, params }: Ctx<readonly [string, string, string]>) => {
      const [name, caution, household] = params
      world.villaName = name
      world.cautionAmount = parsePrice(caution).amount
      world.householdAmount = parsePrice(household).amount
      world.seasonalRanges = []
      world.discountRanges = []
    },
  ),

  Given('a discount over time set as :', ({ world, table }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const rows = table !== undefined ? yield* table.rows(discountRow) : []
      for (const row of rows) {
        world.discountRanges.push({
          fromNights: row.from,
          toNights: row.to,
          percent: Number.parseInt(row.discountAmount.replace("%", "").trim(), 10),
        })
      }
    }),
  ),

  Given('the following pricing range :', ({ world, table }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const rows = table !== undefined ? yield* table.rows(pricingRow) : []
      for (const row of rows) {
        world.seasonalRanges.push({
          from: ddMmYyyyToIso(row.from),
          to: ddMmYyyyToIso(row.to),
          weeklyAmount: parsePrice(row.baseAmount).amount,
        })
      }
    }),
  ),

  Given(
    'a QuotationRequest to villa named {string} from {string} to {string} for {int} adults and {int} children',
    ({ world, params }: Ctx<readonly [string, string, string, number, number]>) => {
      const [villaName, from, to, adults, children] = params
      if (world.villaName !== villaName) {
        throw new Error(`villa name must match the background: expected "${world.villaName}", got "${villaName}"`)
      }
      world.quotationRequest = { villaName, from, to, adultsCount: adults, childrenCount: children }
    },
  ),

  Given('villa named {string} is booked :', ({ world, table }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const rows = table !== undefined ? yield* table.rows(bookedRow) : []
      for (const row of rows) {
        if (world.actorNamed(row.customer) === undefined) {
          yield* registerCustomer(world, {
            email: row.customer,
            password: "existing-pass-1",
            phoneNumber: "0601020304",
            firstname: row.customer.split("@")[0]!,
            lastname: "Booked",
          })
        }
        yield* submitQuotation(world, row.customer, {
          villaName: world.villaName,
          from: row.from,
          to: row.to,
          adultsCount: row.adults,
          childrenCount: row.children,
        })
        world.expectSuccess()
      }
    }),
  ),

  When('the customer submits the QuotationRequest', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const email = world.currentEmail
      if (email === undefined) return yield* Effect.die("a customer must be logged in")
      world.emailCountMark = world.doubles.mails.length
      yield* submitQuotation(world, email, world.quotationRequest!)
    }),
  ),

  Given(
    '{string} has a quotation request by {string} from {string} to {string} for {int} adults and {int} children',
    ({ world, params }: Ctx<readonly [string, string, string, string, number, number]>) =>
      Effect.gen(function* () {
        const [, email, from, to, adults, children] = params
        yield* submitQuotation(world, email, {
          villaName: world.villaName,
          from,
          to,
          adultsCount: adults,
          childrenCount: children,
        })
        world.expectSuccess()
      }),
  ),

  Given('a "BookingRequested" event has been dispatched', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const events = yield* world.events()
      if (!events.some((stored) => stored.type === "BookingRequested")) {
        return yield* Effect.die("a BookingRequested event should be in the store")
      }
    }),
  ),

  When('the message is handled', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      world.emailCountMark = world.doubles.mails.length
      yield* world.runWorkers()
    }),
  ),

  When('customer has signed quotation', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      world.emailCountMark = world.doubles.mails.length
      const bookingId = world.quotationResult!.bookingId
      const exit = yield* world.dispatch(SignQuotation, { bookingId, fileName: "signed-quotation.pdf" }, { actor: "customer" })
      if (Exit.isSuccess(exit)) yield* world.runWorkers()
    }),
  ),

  Given('the signed quotation is uploaded', ({ world }: Ctx<readonly []>) => {
    const bookingId = world.quotationResult!.bookingId
    world.doubles.files.set(`booking/${bookingId}/signed/signed-quotation.pdf`, new TextEncoder().encode("signed"))
  }),

  Given('quotation has been generated', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      yield* world.runWorkers()
      const bookingId = world.quotationResult!.bookingId
      if (!world.doubles.files.has(quotationPath(bookingId))) {
        return yield* Effect.die("the quotation PDF should have been generated")
      }
    }),
  ),

  // --- thens ------------------------------------------------------------------

  Then('an exception {string} should be thrown with message {string}', ({ world, params }: Ctx<readonly [string, string]>) => {
    const [tag, message] = params
    world.expectFailure(tag, message)
  }),

  Then(
    'it should be accepted with a total amount of {string}, a tourist tax of {string} unranked and {string} with a 4 star rating ranking and a deposit amount of {string}',
    ({ world, params }: Ctx<readonly [string, string, string, string]>) => {
      const [total, unranked, ranked, deposit] = params
      world.expectSuccess()
      const pricing = world.quotationResult?.pricing
      if (pricing === undefined) throw new Error("a quotation result should exist")
      const assertEuro = (actual: number | undefined, expected: string): void => {
        if (actual === undefined || norm(formatEuros(actual)) !== norm(expected)) {
          throw new Error(`expected ${norm(expected)}, got ${actual === undefined ? "none" : norm(formatEuros(actual))}`)
        }
      }
      assertEuro(pricing.totalAmount, total)
      assertEuro(pricing.unrankedTouristTax, unranked)
      assertEuro(pricing.rankedTouristTax, ranked)
      assertEuro(pricing.depositAmount, deposit)
    },
  ),

  Then('{int} emails should have been sent', ({ world, params }: Ctx<readonly [number]>) => {
    const [count] = params
    const sinceMark = world.doubles.mails.length - world.emailCountMark
    if (sinceMark !== count) {
      throw new Error(
        `expected ${count} new emails, got ${sinceMark}:\n${world.doubles.mails.map((m) => `- ${m.to}: ${m.subject}`).join("\n")}`,
      )
    }
  }),

  Then('a "BookingRequested" event should have been dispatched', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const events = yield* world.events()
      if (!events.some((stored) => stored.type === "BookingRequested")) {
        return yield* Effect.die("a BookingRequested event should be in the store")
      }
    }),
  ),

  Then('pdf file should have been generated and placed on filesystem with path {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [expectedPath] = params
    const bookingId = world.quotationResult!.bookingId
    const resolved = expectedPath.replace("<bookingId>", bookingId)
    if (!world.doubles.files.has(resolved)) {
      throw new Error(`file ${resolved} should exist (files: ${[...world.doubles.files.keys()].join(", ")})`)
    }
  }),

  Then('the booking should in state {string}', ({ world, params }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const [status] = params
      const bookingId = world.quotationResult!.bookingId
      const owner = world.quotationOwnerId
      if (owner === undefined) return yield* Effect.die("the booking owner must be known")
      // The row-level ownership check in the query handler reads the ambient
      // principal, so the query runs as the booking's customer.
      const exit = yield* Principal.within({ id: owner, roles: ["customer"], kind: "user" })(
        world.query(GetBooking, { bookingId }, { actor: owner }),
      )
      if (Exit.isFailure(exit)) {
        return yield* Effect.die(`GetBooking failed for ${bookingId}: ${String(Cause.squash(exit.cause))}`)
      }
      if (exit.value.status !== status) {
        return yield* Effect.die(`expected state "${status}", got "${exit.value.status}"`)
      }
    }),
  ),
]
