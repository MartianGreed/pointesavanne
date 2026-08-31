import { describe, expect, test } from "bun:test"
import { Effect, Layer, Scope } from "effect"
import { AggregateStore, InMemoryAll, type EventStore } from "@structure-ai/eventsourcing"
import {
  RateCardVillaCatalog,
  VillaCatalog,
  cardHorizon,
  defaultVilla,
  ensureRateCard,
  seedSeasons,
  seasonalRangesForYear,
} from "../src/catalog.ts"
import { RateCard, rateCardIdOf, seasonIdOf } from "../src/ratecard/ratecard.ts"
import { rateCardRegistry } from "../src/events.ts"
import { PricingContext } from "../src/booking/pricing.ts"

describe("seasonalRangesForYear (recurring rate card)", () => {
  test("projects the legacy season structure onto the target year", () => {
    expect(seasonalRangesForYear(2026)).toEqual([
      { from: "2026-01-02", to: "2026-02-03", weeklyAmount: 1890 },
      { from: "2026-02-04", to: "2026-03-03", weeklyAmount: 2090 },
      { from: "2026-03-04", to: "2026-05-05", weeklyAmount: 1890 },
      { from: "2026-05-06", to: "2026-06-30", weeklyAmount: 1600 },
      { from: "2026-07-01", to: "2026-08-25", weeklyAmount: 1700 },
      { from: "2026-08-26", to: "2026-10-20", weeklyAmount: 1600 },
      { from: "2026-10-21", to: "2026-12-15", weeklyAmount: 1700 },
      { from: "2026-12-16", to: "2027-01-01", weeklyAmount: 2090 },
    ])
  })

  test("prices the stay that broke the funnel: 05/09/2026 - 12/09/2026", () => {
    const ctx = PricingContext.create(
      seasonalRangesForYear(2026),
      defaultVilla.discountRanges,
      "2026-09-05",
      "2026-09-12",
    )
    // September sits in the 1600 €/week season; seven nights, no duration discount.
    expect(ctx.total().cents).toBe(160000)
  })

  test("walks a stay across the New Year holiday into next year's January season", () => {
    const ctx = PricingContext.create(
      [...seasonalRangesForYear(2026), ...seasonalRangesForYear(2027)],
      defaultVilla.discountRanges,
      "2026-12-20",
      "2027-01-08",
    )
    // 19 nights: the holiday range covers through the Jan 1→2 night (2090 €/week),
    // January then takes over (1890 €/week); the duration discount applies by
    // global night index — 10% from night 8, 15% from night 15.
    expect(ctx.total().cents).toBe(509279)
  })
})

describe("cardHorizon (rolling projection)", () => {
  test("last year through two years out", () => {
    expect(cardHorizon(new Date("2026-08-31T00:00:00.000Z"))).toEqual([2025, 2026, 2027, 2028])
  })

  test("never reaches into the legacy 2022-2023 block", () => {
    expect(cardHorizon(new Date("2023-05-01T00:00:00.000Z"))).toEqual([2024, 2025])
  })
})

describe("defaultVilla (production card)", () => {
  const currentYear = new Date().getUTCFullYear()

  test("keeps the legacy 2022-2023 fixtures", () => {
    expect(defaultVilla.seasonalRanges).toContainEqual({ from: "2022-03-05", to: "2022-05-06", weeklyAmount: 1890 })
    expect(defaultVilla.seasonalRanges).toContainEqual({ from: "2023-12-16", to: "2023-12-31", weeklyAmount: 2090 })
  })

  test("prices a stay this September — the card must cover the current year", () => {
    const ctx = PricingContext.create(
      defaultVilla.seasonalRanges,
      defaultVilla.discountRanges,
      `${currentYear}-09-05`,
      `${currentYear}-09-12`,
    )
    expect(ctx.total().cents).toBeGreaterThan(0)
  })

  test("prices a stay two years out — a rolling horizon, not a staling card", () => {
    const ctx = PricingContext.create(
      defaultVilla.seasonalRanges,
      defaultVilla.discountRanges,
      `${currentYear + 2}-09-05`,
      `${currentYear + 2}-09-12`,
    )
    expect(ctx.total().cents).toBeGreaterThan(0)
  })
})

/**
 * Runs a program against the production catalog over a fresh in-memory
 * event store (one card per run — tests stay isolated).
 */
const withCatalog = async <E>(
  program: Effect.Effect<void, E, VillaCatalog | EventStore>,
): Promise<void> => {
  const scope = Effect.runSync(Scope.make())
  const layer = Layer.provideMerge(RateCardVillaCatalog, InMemoryAll)
  const context = await Effect.runPromise(Layer.buildWithScope(layer, scope))
  await Effect.runPromise(Effect.provide(program, Layer.succeedContext(context)))
  await Effect.runPromise(Scope.close(scope, Effect.void as never))
}

describe("RateCardVillaCatalog (owner-managed card)", () => {
  test("the seeded card prices exactly like the code card it replaced", async () => {
    await withCatalog(
      Effect.gen(function* () {
        const catalog = yield* VillaCatalog
        const villa = yield* catalog.find(defaultVilla.villaId)
        const stays: ReadonlyArray<readonly [string, string]> = [
          ["2022-05-30", "2022-06-13"], // legacy, two seasons
          ["2023-02-06", "2023-02-27"], // legacy, with duration discount
          ["2026-09-05", "2026-09-12"], // the horizon that broke the funnel
          ["2026-12-20", "2027-01-08"], // cross-year holiday
        ]
        for (const [from, to] of stays) {
          const seeded = PricingContext.create(villa.seasonalRanges, villa.discountRanges, from, to).total().cents
          const code = PricingContext.create(defaultVilla.seasonalRanges, defaultVilla.discountRanges, from, to).total().cents
          expect(seeded).toBe(code)
        }
      }),
    )
  })

  test("an unknown villa is still a NotFound", async () => {
    await withCatalog(
      Effect.gen(function* () {
        const catalog = yield* VillaCatalog
        const outcome = yield* Effect.either(catalog.find("villa-unknown"))
        expect(outcome._tag).toBe("Left")
      }),
    )
  })

  test("owner edits flow into pricing: define prices a once-uncovered stay, remove unprices it", async () => {
    await withCatalog(
      Effect.gen(function* () {
        const catalog = yield* VillaCatalog
        yield* ensureRateCard(defaultVilla.villaId, seedSeasons())

        const store = yield* AggregateStore.make(RateCard, rateCardRegistry)
        const cardId = rateCardIdOf(defaultVilla.villaId)
        yield* store.executeWithRetry(cardId, {
          _tag: "DefineSeason",
          id: cardId,
          villaId: defaultVilla.villaId,
          from: "2099-01-05",
          to: "2099-02-05",
          weeklyAmount: 1400,
        })

        const villa = yield* catalog.find(defaultVilla.villaId)
        const priced = PricingContext.create(villa.seasonalRanges, villa.discountRanges, "2099-01-12", "2099-01-19")
        expect(priced.total().cents).toBe(140000)

        yield* store.executeWithRetry(cardId, {
          _tag: "RemoveSeason",
          id: cardId,
          villaId: defaultVilla.villaId,
          seasonId: seasonIdOf("2099-01-05", "2099-02-05"),
        })
        const afterRemoval = yield* catalog.find(defaultVilla.villaId)
        expect(() =>
          PricingContext.create(afterRemoval.seasonalRanges, afterRemoval.discountRanges, "2099-01-12", "2099-01-19"),
        ).toThrow()
      }),
    )
  })
})
