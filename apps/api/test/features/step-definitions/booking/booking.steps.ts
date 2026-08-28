import { Given, Then, When, type DataTable } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { CommandBus, QueryBus } from "@structure-ai/cqrs"
import { EventStore } from "@structure-ai/eventsourcing"
import { Stream, Effect } from "effect"
import type { CucumberWorld } from "../../support/world.ts"
import { registerCustomer } from "../../support/actors.ts"
import { GetBooking, RequestQuotation, SignQuotation } from "../../../../src/messages/index.ts"
import { dates, formatEuros, parsePrice } from "../../../../src/booking/pricing.ts"
import { quotationPath } from "../../../../src/infra.ts"
import { Principal } from "@structure-ai/authorization"

const norm = (s: string): string => s.replace(/\s+/g, " ")

/** dd/MM/yyyy (feature tables) → yyyy-mm-dd (commands and events). */
const toIso = (featureDate: string): string => {
  const [day, month, year] = featureDate.split("/")
  return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`
}

const capture = (world: CucumberWorld) => (error: unknown) => {
  const e = error as { _tag?: string; message?: string; issues?: ReadonlyArray<string> }
  world.exception = {
    _tag: e?._tag ?? "Unknown",
    message: e?.message ?? String(error),
    ...(e?.issues !== undefined && { issues: e.issues }),
  }
}

const installVilla = (world: CucumberWorld) => {
  const w = world.world!
  w.doubles.catalog.set({
    villaId: "villa-de-standing-pointe-savanne",
    name: world.villaName,
    cautionAmount: world.cautionAmount,
    householdAmount: world.householdAmount,
    seasonalRanges: world.seasonalRanges,
    discountRanges: world.discountRanges,
  })
}

const submitQuotation = async (world: CucumberWorld, email: string, request: NonNullable<CucumberWorld["quotationRequest"]>) => {
  const w = world.world!
  const customer = world.customers.get(email)
  assert.ok(customer, `${email} must be registered`)
  installVilla(world)
  const outcome = await w.attempt(
    Effect.gen(function* () {
      const bus = yield* CommandBus
      return yield* bus.dispatch(
        RequestQuotation,
        {
          villaId: "villa-de-standing-pointe-savanne",
          from: toIso(request.from),
          to: toIso(request.to),
          adultsCount: request.adultsCount,
          childrenCount: request.childrenCount,
        },
        { actor: customer.userId },
      )
    }) as never,
  )
  if (outcome.ok) {
    world.quotationResult = outcome.value as { bookingId: string; status: string; pricing: Record<string, number> }
    world.quotationOwnerId = customer.userId
    await w.runWorkers()
  } else {
    capture(world)(outcome.error)
  }
}

// --- givens: villa, pricing, discounts -----------------------------------------

Given(
  'a villa {string} with a caution amount of {string} and the mandatory household of {string}',
  function (this: CucumberWorld, name: string, caution: string, household: string) {
    this.villaName = name
    this.cautionAmount = parsePrice(caution).amount
    this.householdAmount = parsePrice(household).amount
    this.seasonalRanges = []
    this.discountRanges = []
  },
)

Given('a discount over time set as :', function (this: CucumberWorld, table: DataTable) {
  for (const row of table.hashes()) {
    this.discountRanges.push({
      fromNights: Number.parseInt(row["from"]!, 10),
      toNights: Number.parseInt(row["to"]!, 10),
      percent: Number.parseInt(row["discountAmount"]!.replace("%", "").trim(), 10),
    })
  }
})

Given('the following pricing range :', function (this: CucumberWorld, table: DataTable) {
  for (const row of table.hashes()) {
    this.seasonalRanges.push({
      from: toIso(row["from"]!),
      to: toIso(row["to"]!),
      weeklyAmount: parsePrice(row["baseAmount"]!).amount,
    })
  }
})

Given(
  'a QuotationRequest to villa named {string} from {string} to {string} for {int} adults and {int} children',
  function (this: CucumberWorld, villaName: string, from: string, to: string, adults: number, children: number) {
    assert.equal(this.villaName, villaName, "villa name must match the background")
    this.quotationRequest = { villaName, from, to, adultsCount: adults, childrenCount: children }
  },
)

Given('villa named {string} is booked :', async function (this: CucumberWorld, _villaName: string, table: DataTable) {
  for (const row of table.hashes()) {
    const email = row["customer"]!
    if (!this.customers.has(email)) {
      await registerCustomer(this, {
        email,
        password: "existing-pass-1",
        phoneNumber: "0601020304",
        firstname: email.split("@")[0]!,
        lastname: "Booked",
      })
    }
    await submitQuotation(this, email, {
      villaName: this.villaName,
      from: row["from"]!,
      to: row["to"]!,
      adultsCount: Number.parseInt(row["adults"]!, 10),
      childrenCount: Number.parseInt(row["children"]!, 10),
    })
    assert.equal(this.exception, undefined, `existing booking for ${email} should succeed`)
  }
})

// --- when ------------------------------------------------------------------------

When('the customer submits the QuotationRequest', async function (this: CucumberWorld) {
  const email = this.currentEmail
  assert.ok(email, "a customer must be logged in")
  const w = await this.ensure()
  this.emailCountMark = w.doubles.mails.length
  await submitQuotation(this, email, this.quotationRequest!)
})

Given(
  '{string} has a quotation request by {string} from {string} to {string} for {int} adults and {int} children',
  async function (this: CucumberWorld, _villaName: string, email: string, from: string, to: string, adults: number, children: number) {
    await submitQuotation(this, email, { villaName: this.villaName, from, to, adultsCount: adults, childrenCount: children })
    assert.equal(this.exception, undefined, "the quotation request should succeed")
  },
)

Given('a "BookingRequested" event has been dispatched', async function (this: CucumberWorld) {
  await this.ensure()
  const w = this.world!
  const dispatched = await w.run(
    Effect.map(
      Effect.flatMap(EventStore, (store) => Stream.runCollect(store.readAll())),
      (events) =>
        [...(events as Iterable<{ type: string }>)].some((stored) => stored.type === "BookingRequested"),
    ) as never,
  )
  assert.ok(dispatched, "a BookingRequested event should be in the store")
})

When('the message is handled', async function (this: CucumberWorld) {
  const w = await this.ensure()
  this.emailCountMark = w.doubles.mails.length
  await w.runWorkers()
})

When('customer has signed quotation', async function (this: CucumberWorld) {
  const w = await this.ensure()
  this.emailCountMark = w.doubles.mails.length
  const bookingId = this.quotationResult!.bookingId
  const outcome = await w.attempt(
    Effect.gen(function* () {
      const bus = yield* CommandBus
      yield* bus.dispatch(SignQuotation, { bookingId, fileName: "signed-quotation.pdf" }, { actor: "customer" })
    }) as never,
  )
  if (!outcome.ok) {
    capture(this)(outcome.error)
    return
  }
  await w.runWorkers()
})

Given('the signed quotation is uploaded', function (this: CucumberWorld) {
  const w = this.world!
  const bookingId = this.quotationResult!.bookingId
  w.doubles.files.set(`booking/${bookingId}/signed/signed-quotation.pdf`, new TextEncoder().encode("signed"))
})

Given('quotation has been generated', async function (this: CucumberWorld) {
  const w = await this.ensure()
  await w.runWorkers()
  const bookingId = this.quotationResult!.bookingId
  assert.ok(w.doubles.files.has(quotationPath(bookingId)), "the quotation PDF should have been generated")
})

// --- thens -----------------------------------------------------------------------

Then(
  'an exception {string} should be thrown with message {string}',
  function (this: CucumberWorld, tag: string, message: string) {
    assert.ok(this.exception, "an exception should have been thrown")
    assert.equal(this.exception!._tag, tag, `expected ${tag}, got ${this.exception!._tag}`)
    const actual =
      this.exception!.issues !== undefined && this.exception!.issues.length > 0
        ? this.exception!.issues[0]
        : this.exception!.message
    assert.equal(norm(actual ?? ""), norm(message))
  },
)

Then(
  'it should be accepted with a total amount of {string}, a tourist tax of {string} unranked and {string} with a 4 star rating ranking and a deposit amount of {string}',
  function (this: CucumberWorld, total: string, unranked: string, ranked: string, deposit: string) {
    const pricing = this.quotationResult?.pricing
    assert.ok(pricing, "a quotation result should exist")
    assert.equal(norm(formatEuros(pricing!.totalAmount!)), norm(total))
    assert.equal(norm(formatEuros(pricing!.unrankedTouristTax!)), norm(unranked))
    assert.equal(norm(formatEuros(pricing!.rankedTouristTax!)), norm(ranked))
    assert.equal(norm(formatEuros(pricing!.depositAmount!)), norm(deposit))
    this.exception = undefined
  },
)

Then('{int} emails should have been sent', function (this: CucumberWorld, count: number) {
  const w = this.world!
  const sinceMark = w.doubles.mails.length - this.emailCountMark
  assert.equal(
    sinceMark,
    count,
    `expected ${count} new emails, got ${sinceMark}:\n${w.doubles.mails.map((m) => `- ${m.to}: ${m.subject}`).join("\n")}`,
  )
})

Then('a "BookingRequested" event should have been dispatched', async function (this: CucumberWorld) {
  await this.ensure()
  const w = this.world!
  const dispatched = await w.run(
    Effect.map(
      Effect.flatMap(EventStore, (store) => Stream.runCollect(store.readAll())),
      (events) =>
        [...(events as Iterable<{ type: string }>)].some((stored) => stored.type === "BookingRequested"),
    ) as never,
  )
  assert.ok(dispatched, "a BookingRequested event should be in the store")
})

Then(
  'pdf file should have been generated and placed on filesystem with path {string}',
  function (this: CucumberWorld, expectedPath: string) {
    const w = this.world!
    const bookingId = this.quotationResult!.bookingId
    const resolved = expectedPath.replace("<bookingId>", bookingId)
    assert.ok(w.doubles.files.has(resolved), `file ${resolved} should exist (files: ${[...w.doubles.files.keys()].join(", ")})`)
  },
)

Then('the booking should in state {string}', async function (this: CucumberWorld, status: string) {
  const w = await this.ensure()
  const bookingId = this.quotationResult!.bookingId
  const owner = this.quotationOwnerId
  assert.ok(owner, "the booking owner must be known")
  const row = await w.run(
    Principal.within({ id: owner, roles: ["customer"], kind: "user" })(
      Effect.gen(function* () {
        const bus = yield* QueryBus
        return yield* bus.dispatch(GetBooking, { bookingId }, { actor: owner })
      }) as never,
    ),
  )
  assert.equal((row as { status: string }).status, status)
})

