import { Aggregate, DomainEvent, EntityId, InvariantViolation, ValidationFailed } from "@structure-ai/domain"
import { Effect, Schema } from "effect"
import { dates, type SeasonalRange } from "../booking/pricing.ts"

/**
 * Rate card — the villa's seasonal prices, owned by the villa owner.
 *
 * The card "graduated" from the code catalog: until now the seasons were
 * hardcoded (and silently expired); they are now runtime data the owner
 * manages period by period, with the event stream as the audit trail of
 * every price change.
 *
 * Language: a season is an INCLUSIVE period [from, to] of ISO days with a
 * weekly amount — the owner's language. The pricing engine's ranges are a
 * translation detail (see engineRangeOf / ownerPeriodOf); the pinned legacy
 * card seeds through that same translation, so behavior is preserved.
 *
 * Identity is the villa id — one card (and one stream) per villa, so the
 * overlap invariant below is enforced under the stream's strong consistency.
 */

export const RateCardId = EntityId.define("RateCardId")

/** `ratecard:<villaId>` — stable, collision-free stream id. */
export const rateCardIdOf = (villaId: string): EntityId.Of<typeof RateCardId> =>
  RateCardId.make(`ratecard:${villaId}`)

/** A seasonal price: the inclusive period [from, to], priced per week. */
export interface Season {
  readonly seasonId: string
  readonly from: string // ISO day, inclusive
  readonly to: string // ISO day, inclusive
  readonly weeklyAmount: number // euros per week
}

const SeasonSchema = Schema.Struct({
  seasonId: Schema.String,
  from: Schema.String,
  to: Schema.String,
  weeklyAmount: Schema.Number,
})

/** `from_to` — deterministic, so event streams replay without generated ids. */
export const seasonIdOf = (from: string, to: string): string => `${from}_${to}`

export const RateCardInitialized = DomainEvent.define("RateCardInitialized", {
  rateCardId: RateCardId.schema,
  villaId: Schema.String,
  seasons: Schema.Array(SeasonSchema),
})

export const SeasonDefined = DomainEvent.define("SeasonDefined", {
  rateCardId: RateCardId.schema,
  villaId: Schema.String,
  seasonId: Schema.String,
  from: Schema.String,
  to: Schema.String,
  weeklyAmount: Schema.Number,
})

export const SeasonRemoved = DomainEvent.define("SeasonRemoved", {
  rateCardId: RateCardId.schema,
  villaId: Schema.String,
  seasonId: Schema.String,
})

export type RateCardEvent = typeof RateCardInitialized.Type | typeof SeasonDefined.Type | typeof SeasonRemoved.Type

export interface RateCardState {
  readonly status: "none" | "initialized"
  readonly villaId?: string
  readonly seasons: ReadonlyArray<Season>
}

export type RateCardCommand =
  | {
      readonly _tag: "InitializeRateCard"
      readonly id: EntityId.Of<typeof RateCardId>
      readonly villaId: string
      readonly seasons: ReadonlyArray<Season>
    }
  | {
      readonly _tag: "DefineSeason"
      readonly id: EntityId.Of<typeof RateCardId>
      readonly villaId: string
      readonly from: string
      readonly to: string
      readonly weeklyAmount: number
    }
  | {
      readonly _tag: "RemoveSeason"
      readonly id: EntityId.Of<typeof RateCardId>
      readonly villaId: string
      readonly seasonId: string
    }

/** Two inclusive periods share a day when each starts before the other ends. */
const periodsOverlap = (a: { from: string; to: string }, b: { from: string; to: string }): boolean =>
  !dates.isBefore(dates.parse(a.to), dates.parse(b.from), true) &&
  !dates.isBefore(dates.parse(b.to), dates.parse(a.from), true)

const byFrom = (a: Season, b: Season): number => a.from.localeCompare(b.from)

const upsert = (seasons: ReadonlyArray<Season>, season: Season): ReadonlyArray<Season> =>
  [...seasons.filter((existing) => existing.seasonId !== season.seasonId), season].sort(byFrom)

export const RateCard = Aggregate.define<RateCardState, RateCardCommand, RateCardEvent, InvariantViolation | ValidationFailed>({
  name: "RateCard",
  initial: { status: "none", seasons: [] },
  decide: (state, command) => {
    switch (command._tag) {
      // Idempotent bootstrap: initializing an initialized card is a no-op —
      // concurrent first accesses race, the loser retries into this branch.
      case "InitializeRateCard":
        if (state.status === "initialized") return Effect.succeed([])
        return Effect.succeed([
          RateCardInitialized.make({
            rateCardId: command.id,
            villaId: command.villaId,
            seasons: [...command.seasons].sort(byFrom),
          }),
        ])
      case "DefineSeason": {
        if (state.status !== "initialized") {
          return Effect.fail(new InvariantViolation({ rule: "rate card is not initialized" }))
        }
        try {
          dates.parse(command.from)
          dates.parse(command.to)
        } catch {
          return Effect.fail(
            new ValidationFailed({ subject: "season", issues: [`invalid period ${command.from} - ${command.to}`] }),
          )
        }
        if (!dates.isBefore(dates.parse(command.from), dates.parse(command.to))) {
          return Effect.fail(
            new ValidationFailed({
              subject: "season",
              issues: [
                `season must span at least one night: ${dates.format(dates.parse(command.from))} - ${dates.format(dates.parse(command.to))}`,
              ],
            }),
          )
        }
        if (command.weeklyAmount <= 0) {
          return Effect.fail(
            new ValidationFailed({ subject: "season", issues: ["weekly amount must be positive"] }),
          )
        }
        const seasonId = seasonIdOf(command.from, command.to)
        // Redefining the exact same period updates it; anything else that
        // shares a day with an existing season is rejected — the owner
        // removes or redefines the conflicting period first.
        const conflicting = state.seasons.find(
          (existing) =>
            existing.seasonId !== seasonId && periodsOverlap(existing, { from: command.from, to: command.to }),
        )
        if (conflicting !== undefined) {
          return Effect.fail(
            new ValidationFailed({
              subject: "season",
              issues: [
                `period ${command.from} - ${command.to} overlaps ${conflicting.from} - ${conflicting.to}`,
              ],
            }),
          )
        }
        return Effect.succeed([
          SeasonDefined.make({
            rateCardId: command.id,
            villaId: command.villaId,
            seasonId,
            from: command.from,
            to: command.to,
            weeklyAmount: command.weeklyAmount,
          }),
        ])
      }
      case "RemoveSeason": {
        if (state.status !== "initialized") {
          return Effect.fail(new InvariantViolation({ rule: "rate card is not initialized" }))
        }
        if (!state.seasons.some((season) => season.seasonId === command.seasonId)) {
          return Effect.fail(
            new ValidationFailed({ subject: "season", issues: [`unknown season ${command.seasonId}`] }),
          )
        }
        return Effect.succeed([
          SeasonRemoved.make({ rateCardId: command.id, villaId: command.villaId, seasonId: command.seasonId }),
        ])
      }
    }
  },
  evolve: (state, event) => {
    switch (event._tag) {
      case "RateCardInitialized":
        return { status: "initialized" as const, villaId: event.villaId, seasons: [...event.seasons].sort(byFrom) }
      case "SeasonDefined":
        return {
          ...state,
          seasons: upsert(state.seasons, {
            seasonId: event.seasonId,
            from: event.from,
            to: event.to,
            weeklyAmount: event.weeklyAmount,
          }),
        }
      case "SeasonRemoved":
        return { ...state, seasons: state.seasons.filter((season) => season.seasonId !== event.seasonId) }
    }
  },
})

export const rateCardEventRegistryEntries = [
  { schema: RateCardInitialized, schemaVersion: 1 },
  { schema: SeasonDefined, schemaVersion: 1 },
  { schema: SeasonRemoved, schemaVersion: 1 },
]

// ---------------------------------------------------------------------------
// Owner periods ⇄ engine ranges. The pricing engine (pinned by the BDD
// features) treats a range (from, to) as an open interval for coverage and
// walks boundary nights with its own include flags; an inclusive owner
// period [A, B] translates to (A-1, B+1) so every stay the owner means to
// cover — arrivals A..B-1, departures A+1..B — prices, boundary night
// included. The inverse seeds the legacy card without drift.
// ---------------------------------------------------------------------------

export const engineRangeOf = (season: Season): SeasonalRange => ({
  from: dates.toIsoDay(dates.addDays(dates.parse(season.from), -1)),
  to: dates.toIsoDay(dates.addDays(dates.parse(season.to), 1)),
  weeklyAmount: season.weeklyAmount,
})

/** The owner period a legacy engine range actually made priceable, if any. */
export const ownerPeriodOf = (range: SeasonalRange): Season | null => {
  const from = dates.addDays(dates.parse(range.from), 1)
  const to = dates.addDays(dates.parse(range.to), -1)
  if (!dates.isBefore(from, to, true)) return null
  return {
    seasonId: seasonIdOf(dates.toIsoDay(from), dates.toIsoDay(to)),
    from: dates.toIsoDay(from),
    to: dates.toIsoDay(to),
    weeklyAmount: range.weeklyAmount,
  }
}
