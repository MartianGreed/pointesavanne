import { NotFound } from "@structure-ai/domain"
import { Context, Effect, Layer, Option } from "effect"
import type { VillaPricing } from "./booking/pricing.ts"

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

export const defaultVilla: VillaPricing = {
  villaId: "villa-de-standing-pointe-savanne",
  name: "Villa de standing - Pointe Savanne",
  cautionAmount: 2000,
  householdAmount: 200,
  seasonalRanges: [
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
  ],
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
