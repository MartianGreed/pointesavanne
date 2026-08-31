import { NotFound } from "@structure-ai/domain"
import { AggregateStore, type EventStore } from "@structure-ai/eventsourcing"
import { Context, Effect, Layer, Option } from "effect"
import type { SeasonalRange, VillaPricing } from "./booking/pricing.ts"
import { rateCardRegistry } from "./events.ts"
import { RateCard, engineRangeOf, ownerPeriodOf, rateCardIdOf, type RateCardState, type Season } from "./ratecard/ratecard.ts"

/**
 * The villa catalog: identity, deposits and discounts per villa (code), plus
 * the seasonal prices — the owner's RateCard aggregate since the card
 * graduated from hardcoded ranges. The BDD features drive their fixture
 * villas through the test layer (MutableVillaCatalog) so their tables stay
 * authoritative; production binds RateCardVillaCatalog, which seeds the
 * owner's card once from `defaultVilla` and then serves whatever the owner
 * defined.
 */
export class VillaCatalog extends Context.Tag("pointesavanne/VillaCatalog")<
  VillaCatalog,
  { readonly find: (villaId: string) => Effect.Effect<VillaPricing, NotFound, EventStore> }
>() {}

export const villaNotFound = (villaId: string): NotFound => new NotFound({ entity: "villa", id: villaId })

/**
 * The legacy 2022–2023 card, kept verbatim: the unit/BDD/API fixtures price
 * against these exact ranges.
 */
const legacySeasonalRanges: ReadonlyArray<SeasonalRange> = [
  { from: "2022-03-05", to: "2022-05-06", weeklyAmount: 1890 },
  { from: "2022-05-07", to: "2022-07-01", weeklyAmount: 1600 },
  { from: "2022-07-02", to: "2022-08-26", weeklyAmount: 1700 },
  { from: "2022-08-27", to: "2022-10-21", weeklyAmount: 1600 },
  { from: "2022-10-22", to: "2022-12-16", weeklyAmount: 1700 },
  { from: "2022-12-17", to: "2023-01-01", weeklyAmount: 2090 },
  { from: "2023-01-02", to: "2023-02-03", weeklyAmount: 1890 },
  { from: "2023-02-04", to: "2023-03-03", weeklyAmount: 2090 },
  { from: "2023-03-04", to: "2023-05-05", weeklyAmount: 1890 },
  { from: "2023-05-06", to: "2023-06-30", weeklyAmount: 1600 },
  { from: "2023-07-01", to: "2023-08-25", weeklyAmount: 1700 },
  { from: "2023-08-26", to: "2023-10-20", weeklyAmount: 1600 },
  { from: "2023-10-21", to: "2023-12-15", weeklyAmount: 1700 },
  { from: "2023-12-16", to: "2023-12-31", weeklyAmount: 2090 },
]

/**
 * The card's season structure repeats every year — the 2022 and 2023 cards
 * carry the same weekly amounts, drifting ±1 day. This template is the 2023
 * boundary set, transcribed as recurring month-day windows.
 */
const SEASONS: ReadonlyArray<{ readonly from: string; readonly to: string; readonly weeklyAmount: number }> = [
  { from: "01-02", to: "02-03", weeklyAmount: 1890 },
  { from: "02-04", to: "03-03", weeklyAmount: 2090 },
  { from: "03-04", to: "05-05", weeklyAmount: 1890 },
  { from: "05-06", to: "06-30", weeklyAmount: 1600 },
  { from: "07-01", to: "08-25", weeklyAmount: 1700 },
  { from: "08-26", to: "10-20", weeklyAmount: 1600 },
  { from: "10-21", to: "12-15", weeklyAmount: 1700 },
]

/**
 * Projects the rate card onto `year`: the seven in-year seasons plus the New
 * Year holiday (Dec 16 → Jan 1 of the next year, as the legacy 2022 card
 * crossed years). Pure — the caller picks the year.
 */
export const seasonalRangesForYear = (year: number): ReadonlyArray<SeasonalRange> => [
  ...SEASONS.map((season) => ({
    from: `${year}-${season.from}`,
    to: `${year}-${season.to}`,
    weeklyAmount: season.weeklyAmount,
  })),
  { from: `${year}-12-16`, to: `${year + 1}-01-01`, weeklyAmount: 2090 },
]

/**
 * A rolling horizon around today (last year through two years out) — the
 * card never silently expires again. The first projected year never reaches
 * into the legacy block, so ranges cannot overlap.
 */
export const cardHorizon = (today: Date = new Date()): ReadonlyArray<number> => {
  const currentYear = today.getUTCFullYear()
  const firstProjected = Math.max(currentYear - 1, 2024)
  return Array.from({ length: currentYear + 2 - firstProjected + 1 }, (_, index) => firstProjected + index)
}

export const defaultVilla: VillaPricing = {
  villaId: "villa-de-standing-pointe-savanne",
  name: "Villa de standing - Pointe Savanne",
  cautionAmount: 2000,
  householdAmount: 200,
  seasonalRanges: [...legacySeasonalRanges, ...cardHorizon().flatMap(seasonalRangesForYear)],
  discountRanges: [
    { fromNights: 8, toNights: 14, percent: 10 },
    { fromNights: 15, toNights: 21, percent: 15 },
  ],
}

/**
 * The default card as owner periods — the one-time seed of the RateCard
 * aggregate: each legacy engine range becomes the period it actually made
 * priceable, so the seeded card prices exactly like the code card did.
 */
export const seedSeasons = (): ReadonlyArray<Season> =>
  defaultVilla.seasonalRanges.flatMap((range) => {
    const period = ownerPeriodOf(range)
    return period === null ? [] : [period]
  })

/**
 * Loads the villa's card, initializing it from `seed` on first access
 * (idempotent; a lost initialization race falls back to the winner's card).
 * The aggregate store is authoritative — pricing and the owner console both
 * read this, never a projection, so the card is always current.
 */
export const ensureRateCard = (
  villaId: string,
  seed: ReadonlyArray<Season> = [],
): Effect.Effect<RateCardState, never, EventStore> =>
  Effect.flatMap(AggregateStore.make(RateCard, rateCardRegistry), (store) => {
    const id = rateCardIdOf(villaId)
    return store.executeWithRetry(id, { _tag: "InitializeRateCard", id, villaId, seasons: seed }).pipe(
      Effect.map((result) => result.state),
      // Initialize is a no-op on an initialized card, so a failure here means
      // a concurrent first-access won the race — the winner's card is the
      // state to read. Decode defects still die.
      Effect.catchAll(() => Effect.map(store.load(id), (loaded) => loaded.state)),
      Effect.catchTag("EventDecodeError", (error) => Effect.die(error)),
    )
  })

/** The villa the rate card administers — today a single-villa catalog. */
export const knownVillaId = (): string => defaultVilla.villaId

/**
 * The production catalog: villa identity, deposits and discounts from code,
 * seasonal prices from the owner's RateCard aggregate (seeded once from the
 * legacy card above, then owned by the operator).
 */
export const RateCardVillaCatalog = Layer.succeed(
  VillaCatalog,
  VillaCatalog.of({
    find: (villaId) =>
      Effect.gen(function* () {
        if (villaId !== defaultVilla.villaId) return yield* Effect.fail(villaNotFound(villaId))
        const card = yield* ensureRateCard(villaId, seedSeasons())
        return { ...defaultVilla, seasonalRanges: card.seasons.map(engineRangeOf) }
      }),
  }),
)

/** Test/fixture catalog: the BDD steps install villas from their tables. */
export const MutableVillaCatalog = () => {
  const villas = new Map<string, VillaPricing>()
  const layer = Layer.succeed(
    VillaCatalog,
    VillaCatalog.of({
      find: (villaId) =>
        Option.fromNullable(villas.get(villaId)).pipe(
          Option.match({
            onNone: () => Effect.fail(villaNotFound(villaId)),
            onSome: (villa) => Effect.succeed(villa),
          }),
        ),
    }),
  )
  return {
    layer,
    set: (villa: VillaPricing) => villas.set(villa.villaId, villa),
    clear: () => villas.clear(),
  }
}
