import { describe, expect, test } from "bun:test"
import { Aggregate } from "@structure-ai/domain"
import { Effect } from "effect"
import { PricingContext } from "../src/booking/pricing.ts"
import {
  RateCard,
  engineRangeOf,
  ownerPeriodOf,
  rateCardIdOf,
  seasonIdOf,
  type RateCardCommand,
  type RateCardState,
  type Season,
} from "../src/ratecard/ratecard.ts"

const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect)
const flip = <A, E>(effect: Effect.Effect<A, E>): Promise<E> => Effect.runPromise(Effect.flip(effect))

const villaId = "villa-de-standing-pointe-savanne"
const id = rateCardIdOf(villaId)

const maySeason: Season = {
  seasonId: seasonIdOf("2026-05-01", "2026-05-31"),
  from: "2026-05-01",
  to: "2026-05-31",
  weeklyAmount: 1600,
}

const initialize: RateCardCommand = { _tag: "InitializeRateCard", id, villaId, seasons: [maySeason] }

const define = (from: string, to: string, weeklyAmount: number): RateCardCommand => ({
  _tag: "DefineSeason",
  id,
  villaId,
  from,
  to,
  weeklyAmount,
})

const remove = (seasonId: string): RateCardCommand => ({ _tag: "RemoveSeason", id, villaId, seasonId })

describe("RateCard aggregate", () => {
  test("initializing emits the seed; re-initializing is a no-op", async () => {
    const first = await run(Aggregate.execute(RateCard, RateCard.initial, initialize))
    expect(first.events).toHaveLength(1)
    expect(first.state).toEqual({ status: "initialized", villaId, seasons: [maySeason] })

    const again = await run(Aggregate.execute(RateCard, first.state, initialize))
    expect(again.events).toHaveLength(0)
    expect(again.state).toEqual(first.state)
  })

  test("defining before initialization is an invariant violation", async () => {
    const error = await flip(Aggregate.execute(RateCard, RateCard.initial, define("2026-07-01", "2026-07-31", 1700)))
    expect(error._tag).toBe("InvariantViolation")
  })

  test("an overlapping period is rejected, naming the conflict", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const error = await flip(Aggregate.execute(RateCard, seeded, define("2026-05-20", "2026-06-10", 1700)))
    expect(error._tag).toBe("ValidationFailed")
    expect((error as { issues: ReadonlyArray<string> }).issues[0]).toContain("2026-05-01 - 2026-05-31")
  })

  test("adjacent periods do not overlap", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const result = await run(Aggregate.execute(RateCard, seeded, define("2026-06-01", "2026-06-30", 1700)))
    expect(result.events).toHaveLength(1)
  })

  test("redefining the same period updates it in place", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const updated = await run(Aggregate.execute(RateCard, seeded, define("2026-05-01", "2026-05-31", 1750)))
    expect(updated.state.seasons).toHaveLength(1)
    expect(updated.state.seasons[0]!.weeklyAmount).toBe(1750)
  })

  test("a period must span at least one night and cost something", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const sameDay = await flip(Aggregate.execute(RateCard, seeded, define("2026-08-01", "2026-08-01", 1600)))
    expect(sameDay._tag).toBe("ValidationFailed")
    const reversed = await flip(Aggregate.execute(RateCard, seeded, define("2026-08-10", "2026-08-01", 1600)))
    expect(reversed._tag).toBe("ValidationFailed")
    const free = await flip(Aggregate.execute(RateCard, seeded, define("2026-08-01", "2026-08-31", 0)))
    expect(free._tag).toBe("ValidationFailed")
  })

  test("seasons stay sorted by period start", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const withJuly = await run(Aggregate.execute(RateCard, seeded, define("2026-07-01", "2026-07-31", 1700)))
    const withMarch = await run(Aggregate.execute(RateCard, withJuly.state, define("2026-03-01", "2026-03-31", 1890)))
    expect(withMarch.state.seasons.map((season) => season.from)).toEqual([
      "2026-03-01",
      "2026-05-01",
      "2026-07-01",
    ])
  })

  test("removing a season: unknown ids fail, known ids disappear", async () => {
    const seeded = (await run(Aggregate.execute(RateCard, RateCard.initial, initialize))).state
    const unknown = await flip(Aggregate.execute(RateCard, seeded, remove("2099-01-01_2099-01-31")))
    expect(unknown._tag).toBe("ValidationFailed")

    const removed = await run(Aggregate.execute(RateCard, seeded, remove(maySeason.seasonId)))
    expect(removed.state.seasons).toHaveLength(0)
  })
})

describe("owner periods ⇄ engine ranges", () => {
  test("an inclusive period becomes the surrounding engine range", () => {
    expect(engineRangeOf(maySeason)).toEqual({
      from: "2026-04-30",
      to: "2026-06-01",
      weeklyAmount: 1600,
    })
  })

  test("the owner's period boundaries are priceable — arrival on from, departure on to", () => {
    const ranges = [engineRangeOf(maySeason)]
    const discounts = [
      { fromNights: 8, toNights: 14, percent: 10 },
      { fromNights: 15, toNights: 21, percent: 15 },
    ]
    // Full week inside the period.
    expect(PricingContext.create(ranges, discounts, "2026-05-10", "2026-05-17").total().cents).toBe(160000)
    // Arriving on the period's first day.
    expect(PricingContext.create(ranges, discounts, "2026-05-01", "2026-05-08").total().cents).toBe(160000)
    // Departing on the period's last day (six nights at 1600 €/week).
    expect(PricingContext.create(ranges, discounts, "2026-05-25", "2026-05-31").total().cents).toBe(137143)
    // A stay poking past the period's end is not covered — the owner said
    // where it ends; extend the period to price such stays.
    expect(() => PricingContext.create(ranges, discounts, "2026-05-30", "2026-06-01").total()).toThrow()
  })

  test("a legacy engine range becomes the period it made priceable, and round-trips", () => {
    const period = ownerPeriodOf({ from: "2023-03-04", to: "2023-05-05", weeklyAmount: 1890 })
    expect(period).toEqual({
      seasonId: "2023-03-05_2023-05-04",
      from: "2023-03-05",
      to: "2023-05-04",
      weeklyAmount: 1890,
    })
    expect(engineRangeOf(period!)).toEqual({ from: "2023-03-04", to: "2023-05-05", weeklyAmount: 1890 })
  })

  test("a degenerate range cannot become a period", () => {
    expect(ownerPeriodOf({ from: "2026-05-01", to: "2026-05-02", weeklyAmount: 1600 })).toBeNull()
  })
})
