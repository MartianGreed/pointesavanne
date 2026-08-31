import { AggregateStore, EventDecodeError, type EventStore } from "@structure-ai/eventsourcing"
import { SqlError } from "@effect/sql/SqlError"
import type * as SqlClient from "@effect/sql/SqlClient"
import { CommandHandler, HandlerRegistry, QueryHandler } from "@structure-ai/cqrs"
import { ConcurrencyConflict, EntityId, InvariantViolation, NotFound, ValidationFailed } from "@structure-ai/domain"
import { Effect, Option } from "effect"
import { Booking, BookingId, type BookingStatus, type PricingSnapshot } from "./booking/booking.ts"
import { dates } from "./booking/pricing.ts"
import {
  VillaCatalog,
  ensureRateCard,
  knownVillaId,
  seedSeasons,
} from "./catalog.ts"
import { CustomerId, CustomerProfile } from "./customer/profile.ts"
import { bookingRegistry, leadRegistry, profileRegistry, rateCardRegistry } from "./events.ts"
import { FileNotFound, FileStore, QuotationPdf, quotationPath } from "./infra.ts"
import { ViewModel, ViewStore } from "@structure-ai/viewmodel"
import { QuotationLead, leadIdOf } from "./lead/lead.ts"
import { RateCard, rateCardIdOf, seasonIdOf } from "./ratecard/ratecard.ts"
import {
  CheckAvailability,
  ClaimQuotationLeads,
  DefineSeason,
  GenerateQuotation,
  GetBooking,
  GetProfile,
  ListAllBookings,
  ListMyBookings,
  ListSeasons,
  RemoveSeason,
  RequestQuotation,
  SaveProfile,
  SignQuotation,
  SubmitQuotationLead,
  ValidateQuotation,
  type BookingRowType,
} from "./messages/index.ts"
import { policy } from "./policy.ts"
import { BookingView, CustomerProfileView, isVillaAvailable, profileOf } from "./views.ts"

/**
 * Use-case handlers. Commands are thin: authorization and shape validation
 * already happened on the bus; business decisions live in the aggregates'
 * `decide`. Queries read view models — never the event streams.
 *
 * Business failures (validation, not-found, state conflicts) surface in the
 * error channel and map to 4xx problems; infrastructure defects (sql, event
 * decode) die and become 500s.
 */

/** Infrastructure failures are defects, not business rejections. */
const dieInfra = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, Exclude<E, SqlError | EventDecodeError>, R> =>
  (effect as Effect.Effect<A, E | SqlError | EventDecodeError, R>).pipe(
    Effect.catchTag("SqlError", (error) => Effect.die(error)),
    Effect.catchTag("EventDecodeError", (error) => Effect.die(error)),
  ) as unknown as Effect.Effect<A, Exclude<E, SqlError | EventDecodeError>, R>

/** Narrows the post-command status; "none" cannot follow an accepted command. */
const narrowedStatus = <S extends string>(status: S | "none", fallback: S): S =>
  status === "none" ? fallback : status

/** A stay a customer (or a claimed lead) asked a quotation for. */
interface QuotationRequestInput {
  readonly villaId: string
  readonly from: string
  readonly to: string
  readonly adultsCount: number
  readonly childrenCount: number
  readonly message?: string
}

interface QuotationResult {
  readonly bookingId: string
  readonly status: BookingStatus
  readonly pricing: PricingSnapshot
}

interface DispatchIds {
  readonly correlationId?: string
  readonly causationId?: string
  /** Pre-generated id — the claim flow reserves it on the lead first. */
  readonly bookingId?: EntityId.Of<typeof BookingId>
}

/**
 * The booking-request orchestration shared by the signed-in request and the
 * lead claim: catalog lookup, availability check against the (eventually
 * consistent) view — the classic read-side race is accepted and documented;
 * a double-booking is resolved by the owner during validation — then one
 * aggregate transaction.
 */
const requestBooking = (
  actor: string,
  payload: QuotationRequestInput,
  ids: DispatchIds,
): Effect.Effect<QuotationResult, NotFound | ValidationFailed | InvariantViolation | ConcurrencyConflict, VillaCatalog | EventStore | SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const catalog = yield* VillaCatalog
    const villa = yield* catalog.find(payload.villaId)

    const available = yield* dieInfra(isVillaAvailable(payload.villaId, payload.from, payload.to))
    if (!available) {
      return yield* new ValidationFailed({
        subject: "booking",
        issues: [
          `Booking is unavailable for dates ${dates.format(dates.parse(payload.from))} - ${dates.format(dates.parse(payload.to))}`,
        ],
      })
    }

    const store = yield* AggregateStore.make(Booking, bookingRegistry)
    const id = ids.bookingId ?? BookingId.generate()
    const result = yield* dieInfra(
      store.executeWithRetry(
        id,
        {
          _tag: "RequestBooking",
          id,
          customerId: actor,
          villa,
          from: payload.from,
          to: payload.to,
          adultsCount: payload.adultsCount,
          childrenCount: payload.childrenCount,
          ...(payload.message !== undefined && payload.message !== "" ? { message: payload.message } : {}),
        },
        { correlationId: ids.correlationId, causationId: ids.causationId },
      ),
    )
    const requested = result.events[0]
    if (requested === undefined || requested._tag !== "BookingRequested") {
      return yield* new ValidationFailed({ subject: "booking", issues: ["quotation request was not recorded"] })
    }
    return { bookingId: id, status: narrowedStatus(result.state.status, "quotation-requested"), pricing: requested.pricing }
  })

type BookingRow = ViewModel.Of<typeof BookingView>

const rowToApi = (row: BookingRow): BookingRowType => ({
  bookingId: row.id,
  customerId: row.customerId,
  status: row.status as BookingRowType["status"],
  villaId: row.villaId,
  villaName: row.villaName,
  from: row.fromDay,
  to: row.toDay,
  adultsCount: row.adultsCount,
  childrenCount: row.childrenCount,
  nights: row.nights,
  totalAmount: row.totalAmount,
  unrankedTouristTax: row.unrankedTouristTax,
  rankedTouristTax: row.rankedTouristTax,
  depositAmount: row.depositAmount,
  householdAmount: row.householdAmount,
  ...(row.pdfPath !== undefined && { pdfPath: row.pdfPath }),
  ...(row.signedFileName !== undefined && { signedFileName: row.signedFileName }),
})

export const handlers = HandlerRegistry.layer(
  // --- booking --------------------------------------------------------------

  CommandHandler.make(RequestQuotation, (payload, dispatch) =>
    Effect.gen(function* () {
      const actor = dispatch.actor
      if (actor === undefined) {
        return yield* new ValidationFailed({ subject: "request", issues: ["a signed-in customer is required"] })
      }
      return yield* requestBooking(actor, payload, {
        correlationId: dispatch.correlationId,
        causationId: dispatch.messageId,
      })
    }),
  ),

  // --- quotation leads --------------------------------------------------------

  CommandHandler.make(SubmitQuotationLead, (payload, dispatch) =>
    Effect.gen(function* () {
      const email = payload.email.trim().toLowerCase()
      const store = yield* AggregateStore.make(QuotationLead, leadRegistry)
      const id = leadIdOf(email)
      const result = yield* dieInfra(
        store.executeWithRetry(
          id,
          {
            _tag: "SubmitLead",
            id,
            email,
            firstname: payload.firstname.trim(),
            lastname: payload.lastname.trim(),
            phoneNumber: payload.phoneNumber.trim(),
            villaId: payload.villaId,
            from: payload.from,
            to: payload.to,
            adultsCount: payload.adultsCount,
            childrenCount: payload.childrenCount,
            ...(payload.message !== undefined && payload.message !== "" ? { message: payload.message } : {}),
          },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      if (result.state.status !== "submitted") {
        return yield* new ValidationFailed({ subject: "lead", issues: ["quotation lead was not recorded"] })
      }
      return { leadId: id, status: "submitted" as const }
    }),
  ),

  /**
   * Converts the acting customer's pending lead into a profile (when none
   * exists yet) and a quotation request. The e-mail arrives from the HTTP
   * edge (derived from the session) — never trusted from a client payload.
   * The lead is claimed *before* the booking is created so a concurrent
   * claim is a no-op instead of a double booking; a booking that then fails
   * (dates taken in the meantime, villa gone) is reported as an issue on a
   * consumed lead rather than retried forever.
   */
  CommandHandler.make(ClaimQuotationLeads, (payload, dispatch) =>
    Effect.gen(function* () {
      const actor = dispatch.actor
      if (actor === undefined) {
        return yield* new ValidationFailed({ subject: "lead", issues: ["a signed-in customer is required"] })
      }
      const email = payload.email.trim().toLowerCase()
      const leads = yield* AggregateStore.make(QuotationLead, leadRegistry)
      const leadId = leadIdOf(email)
      const { state: lead } = yield* dieInfra(leads.load(leadId))
      if (lead.status !== "submitted") return { claimed: 0, bookings: [], issues: [] }

      const bookingId = BookingId.generate()
      const ids = { correlationId: dispatch.correlationId, causationId: dispatch.messageId }
      const claimed = yield* dieInfra(
        leads.executeWithRetry(leadId, { _tag: "ClaimLead", id: leadId, customerId: actor, bookingId }, ids),
      ).pipe(Effect.catchTag("InvariantViolation", () => Effect.succeed(false)))
      // A concurrent claim got there first — nothing left to convert.
      if (claimed === false) return { claimed: 0, bookings: [], issues: [] }

      const issues: string[] = []

      // Fill an absent profile from the lead's contact details — a saved
      // profile is authoritative and never overwritten by a lead.
      const profile = yield* dieInfra(profileOf(actor))
      if (!profile.saved) {
        const profiles = yield* AggregateStore.make(CustomerProfile, profileRegistry)
        const customerId = CustomerId.make(actor)
        const saved = yield* dieInfra(
          profiles.executeWithRetry(
            customerId,
            {
              _tag: "SaveProfile",
              id: customerId,
              email: lead.email ?? email,
              firstname: lead.firstname ?? "",
              lastname: lead.lastname ?? "",
              phoneNumber: lead.phoneNumber ?? "",
            },
            ids,
          ),
        ).pipe(
          // The quotation must not die on a bad contact detail — report it.
          Effect.catchTag("ValidationFailed", (failure) => Effect.succeed(failure)),
        )
        if ("_tag" in saved && saved._tag === "ValidationFailed") issues.push(...saved.issues)
      }

      const requested = yield* requestBooking(
        actor,
        {
          villaId: lead.villaId ?? "",
          from: lead.from ?? "",
          to: lead.to ?? "",
          adultsCount: lead.adultsCount ?? 1,
          childrenCount: lead.childrenCount ?? 0,
          ...(lead.message !== undefined && { message: lead.message }),
        },
        { ...ids, bookingId },
      ).pipe(
        Effect.catchTags({
          ValidationFailed: (failure) => Effect.succeed(failure),
          NotFound: (failure) =>
            Effect.succeed(new ValidationFailed({ subject: "lead", issues: [`${failure.entity} ${failure.id} not found`] })),
        }),
      )
      const bookings: QuotationResult[] = []
      if ("bookingId" in requested) {
        bookings.push(requested)
      } else {
        issues.push(...requested.issues)
      }

      return { claimed: 1, bookings, issues }
    }),
  ),

  CommandHandler.make(GenerateQuotation, (payload, dispatch) =>
    Effect.gen(function* () {
      const store = yield* AggregateStore.make(Booking, bookingRegistry)
      const id = BookingId.make(payload.bookingId)
      const { state } = yield* dieInfra(store.load(id))
      if (state.status === "none") {
        return yield* new NotFound({ entity: "booking", id: payload.bookingId })
      }
      // Idempotent: a replayed dispatch for an already-advanced booking acks.
      if (state.status !== "quotation-requested" || state.customerId === undefined) {
        return { bookingId: payload.bookingId, status: state.status, pdfPath: state.pdfPath ?? "" }
      }

      const profile = yield* dieInfra(profileOf(state.customerId))
      const pdf = yield* QuotationPdf
      const content = yield* pdf.render({
        bookingId: payload.bookingId,
        villaName: state.villaName ?? "",
        from: state.from ?? "",
        to: state.to ?? "",
        adultsCount: state.adultsCount ?? 0,
        childrenCount: state.childrenCount ?? 0,
        pricing: state.pricing ?? {
          totalAmount: 0,
          unrankedTouristTax: 0,
          rankedTouristTax: 0,
          depositAmount: 0,
          householdAmount: 0,
        },
        customer: { email: profile.email ?? "", name: `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim() },
      })

      const path = quotationPath(payload.bookingId)
      const files = yield* FileStore
      yield* files.save(path, content)

      const result = yield* dieInfra(
        store.executeWithRetry(
          id,
          { _tag: "GenerateQuotation", id, pdfPath: path },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      return { bookingId: payload.bookingId, status: narrowedStatus(result.state.status, "quotation-awaiting-acceptation"), pdfPath: path }
    }),
  ),

  CommandHandler.make(SignQuotation, (payload, dispatch) =>
    Effect.gen(function* () {
      const files = yield* FileStore
      const path = `booking/${payload.bookingId}/signed/${payload.fileName}`
      // The upload must exist before the booking can advance — the legacy
      // FileNotFoundException, as a NotFound at the boundary.
      yield* files.read(path).pipe(
        Effect.catchTag("FileNotFound", () => new NotFound({ entity: "file", id: path })),
      )

      const store = yield* AggregateStore.make(Booking, bookingRegistry)
      const id = BookingId.make(payload.bookingId)
      const result = yield* dieInfra(
        store.executeWithRetry(
          id,
          { _tag: "SignQuotation", id, fileName: payload.fileName },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      return { bookingId: payload.bookingId, status: narrowedStatus(result.state.status, "quotation-signed") }
    }),
  ),

  CommandHandler.make(ValidateQuotation, (payload, dispatch) =>
    Effect.gen(function* () {
      const store = yield* AggregateStore.make(Booking, bookingRegistry)
      const id = BookingId.make(payload.bookingId)
      const result = yield* dieInfra(
        store.executeWithRetry(
          id,
          {
            _tag: "ValidateQuotation",
            id,
            accepted: payload.accepted,
            reason: payload.reason,
            validatedBy: dispatch.actor ?? "owner",
          },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      return { bookingId: payload.bookingId, status: narrowedStatus(result.state.status, "quotation-signed") }
    }),
  ),

  // --- queries ----------------------------------------------------------------

  QueryHandler.make(GetBooking, (payload) =>
    Effect.gen(function* () {
      const store = yield* ViewStore.make(BookingView)
      const row = yield* dieInfra(store.get(payload.bookingId))
      // Row-level ownership, checked here because the bus cannot see the
      // row: the villa owner reads everything, a customer reads their own.
      yield* policy
        .require("booking:read-all")(Effect.void)
        .pipe(
          Effect.catchTag("PermissionDenied", () =>
            policy.require("booking:read-own", { attributes: { ownerId: row.customerId } })(Effect.void),
          ),
        )
      return rowToApi(row)
    }),
  ),

  QueryHandler.make(ListMyBookings, (_payload, dispatch) =>
    Effect.gen(function* () {
      const actor = dispatch.actor
      if (actor === undefined) {
        return yield* new NotFound({ entity: "customer", id: "current" })
      }
      const store = yield* ViewStore.make(BookingView)
      const rows = yield* dieInfra(store.find({ customerId: actor }))
      return { items: rows.map(rowToApi) }
    }),
  ),

  QueryHandler.make(ListAllBookings, (payload) =>
    Effect.gen(function* () {
      const store = yield* ViewStore.make(BookingView)
      const rows =
        payload.status !== undefined
          ? yield* dieInfra(store.find({ status: payload.status }))
          : yield* dieInfra(store.find())
      return { items: rows.map(rowToApi) }
    }),
  ),

  QueryHandler.make(CheckAvailability, (payload) =>
    Effect.map(dieInfra(isVillaAvailable(payload.villaId, payload.from, payload.to)), (available) => ({ available })),
  ),

  // --- pricing (the owner's rate card) ----------------------------------------

  CommandHandler.make(DefineSeason, (payload, dispatch) =>
    Effect.gen(function* () {
      if (payload.villaId !== knownVillaId()) {
        return yield* new NotFound({ entity: "villa", id: payload.villaId })
      }
      yield* ensureRateCard(payload.villaId, seedSeasons())
      const store = yield* AggregateStore.make(RateCard, rateCardRegistry)
      const result = yield* dieInfra(
        store.executeWithRetry(
          rateCardIdOf(payload.villaId),
          {
            _tag: "DefineSeason",
            id: rateCardIdOf(payload.villaId),
            villaId: payload.villaId,
            from: payload.from,
            to: payload.to,
            weeklyAmount: payload.weeklyAmount,
          },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      const season = result.state.seasons.find((s) => s.seasonId === seasonIdOf(payload.from, payload.to))
      if (season === undefined) {
        return yield* new ValidationFailed({ subject: "season", issues: ["season was not recorded"] })
      }
      return { villaId: payload.villaId, seasonId: season.seasonId, from: season.from, to: season.to, weeklyAmount: season.weeklyAmount }
    }),
  ),

  CommandHandler.make(RemoveSeason, (payload, dispatch) =>
    Effect.gen(function* () {
      if (payload.villaId !== knownVillaId()) {
        return yield* new NotFound({ entity: "villa", id: payload.villaId })
      }
      yield* ensureRateCard(payload.villaId, seedSeasons())
      const store = yield* AggregateStore.make(RateCard, rateCardRegistry)
      yield* dieInfra(
        store.executeWithRetry(
          rateCardIdOf(payload.villaId),
          { _tag: "RemoveSeason", id: rateCardIdOf(payload.villaId), villaId: payload.villaId, seasonId: payload.seasonId },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      return { villaId: payload.villaId, seasonId: payload.seasonId }
    }),
  ),

  QueryHandler.make(ListSeasons, (payload) =>
    Effect.gen(function* () {
      if (payload.villaId !== knownVillaId()) {
        return yield* new NotFound({ entity: "villa", id: payload.villaId })
      }
      const card = yield* ensureRateCard(payload.villaId, seedSeasons())
      return {
        items: card.seasons.map((season) => ({
          villaId: payload.villaId,
          seasonId: season.seasonId,
          from: season.from,
          to: season.to,
          weeklyAmount: season.weeklyAmount,
        })),
      }
    }),
  ),

  // --- profile ----------------------------------------------------------------

  CommandHandler.make(SaveProfile, (payload, dispatch) =>
    Effect.gen(function* () {
      const actor = dispatch.actor
      if (actor === undefined) {
        return yield* new ValidationFailed({ subject: "profile", issues: ["a signed-in customer is required"] })
      }
      const store = yield* AggregateStore.make(CustomerProfile, profileRegistry)
      const id = CustomerId.make(actor)
      const result = yield* dieInfra(
        store.executeWithRetry(
          id,
          { _tag: "SaveProfile", id, ...payload },
          { correlationId: dispatch.correlationId, causationId: dispatch.messageId },
        ),
      )
      const state = result.state
      return {
        customerId: id,
        email: state.email ?? payload.email,
        firstname: state.firstname ?? "",
        lastname: state.lastname ?? "",
        phoneNumber: state.phoneNumber ?? "",
        ...(state.language !== undefined && { language: state.language }),
        ...(state.line1 !== undefined && { line1: state.line1 }),
        ...(state.line2 !== undefined && { line2: state.line2 }),
        ...(state.line3 !== undefined && { line3: state.line3 }),
      }
    }),
  ),

  QueryHandler.make(GetProfile, (_payload, dispatch) =>
    Effect.gen(function* () {
      const actor = dispatch.actor
      if (actor === undefined) return { profile: null }
      const store = yield* ViewStore.make(CustomerProfileView)
      const row = yield* dieInfra(store.findById(actor))
      if (Option.isNone(row)) return { profile: null }
      const profile = row.value
      return {
        profile: {
          customerId: profile.id,
          email: profile.email,
          firstname: profile.firstname,
          lastname: profile.lastname,
          phoneNumber: profile.phoneNumber,
          ...(profile.language !== undefined && { language: profile.language }),
          ...(profile.line1 !== undefined && { line1: profile.line1 }),
          ...(profile.line2 !== undefined && { line2: profile.line2 }),
          ...(profile.line3 !== undefined && { line3: profile.line3 }),
        },
      }
    }),
  ),
)
