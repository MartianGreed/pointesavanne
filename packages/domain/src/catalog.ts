import { NotFound } from "@structure-ai/domain"
import { Context, Effect, Layer, Option } from "effect"
import type { SeasonalRange, VillaPricing } from "./booking/pricing.ts"

/**
 * The villa catalog: seasonal pricing, discounts and deposits per villa.
 *
 * Today the catalog is code (the current Pointe Savanne rate card, identical
 * to the legacy fixtures); the BDD features drive it through the test layer so
 * their fixture tables stay authoritative. When pricing becomes editable at
 * runtime it graduates to its own aggregate — this port is the seam.
 */
export class VillaCatalog extends Context.Tag("pointesavanne/VillaCatalog")<
  VillaCatalog,
  { readonly find: (villaId: string) => Effect.Effect<VillaPricing, NotFound> }
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

export const StaticVillaCatalog = Layer.succeed(
  VillaCatalog,
  VillaCatalog.of({
    find: (villaId) =>
      villaId === defaultVilla.villaId ? Effect.succeed(defaultVilla) : Effect.fail(villaNotFound(villaId)),
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
