import { AggregateStore, EventStore, Inbox, Projection } from "@structure-ai/eventsourcing"
import { Booking, BookingId } from "./booking/booking.ts"
import { bookingRegistry } from "./events.ts"
import { ViewModel, ViewProjection, ViewStore } from "@structure-ai/viewmodel"
import * as SqlClient from "@effect/sql/SqlClient"
import { Context, Effect, Schema } from "effect"
import type { AppEvent } from "./events.ts"
import { profileRegistry, registry } from "./events.ts"
import { CustomerId, CustomerProfile } from "./customer/profile.ts"
import { Mailer } from "./infra.ts"
import { renderMail } from "./mail/layout.ts"
import {
  quotationReadyMail,
  quotationRequestAdminMail,
  quotationRequestCustomerMail,
  quotationSignedAdminMail,
} from "./mail/templates.ts"
import { GenerateQuotation } from "./messages/index.ts"
import { CommandBus } from "@structure-ai/cqrs"
import { asSystem } from "./policy.ts"
import { DomainConfigTag } from "./settings.ts"

// ---------------------------------------------------------------------------
// View models (the query side). One table per view, one writing projection
// per table, shaped for their consumers and rebuildable from the events.
// ---------------------------------------------------------------------------

export const BookingView = ViewModel.define({
  name: "BookingView",
  fields: {
    id: Schema.String, // bookingId
    customerId: Schema.String,
    customerEmail: Schema.String,
    status: Schema.String,
    villaId: Schema.String,
    villaName: Schema.String,
    fromDay: Schema.String, // ISO day — `from`/`to` are reserved SQL words
    toDay: Schema.String,
    adultsCount: Schema.Number,
    childrenCount: Schema.Number,
    nights: Schema.Number,
    totalAmount: Schema.Number,
    unrankedTouristTax: Schema.Number,
    rankedTouristTax: Schema.Number,
    depositAmount: Schema.Number,
    householdAmount: Schema.Number,
    pdfPath: Schema.optional(Schema.String),
    signedFileName: Schema.optional(Schema.String),
    rejected: Schema.Boolean,
  },
})

export const CustomerProfileView = ViewModel.define({
  name: "CustomerProfileView",
  fields: {
    id: Schema.String, // auth user id
    email: Schema.String,
    firstname: Schema.String,
    lastname: Schema.String,
    phoneNumber: Schema.String,
    language: Schema.optional(Schema.String),
    line1: Schema.optional(Schema.String),
    line2: Schema.optional(Schema.String),
    line3: Schema.optional(Schema.String),
  },
})

/**
 * The write-side profile — used where a projection must not depend on another
 * projection's progress (PDF rendering, notification emails): the aggregate
 * store is authoritative and always current.
 */
export const profileOf = (customerId: string) =>
  Effect.map(
    AggregateStore.make(CustomerProfile, profileRegistry),
    (store) => store,
  ).pipe(
    Effect.flatMap((store) => store.load(CustomerId.make(customerId))),
    Effect.map((loaded) => loaded.state),
  )

// ---------------------------------------------------------------------------
// Projections hydrating the view tables.
// ---------------------------------------------------------------------------

export const bookingViews: ViewProjection.ViewProjection<AppEvent, never, EventStore | SqlClient.SqlClient> =
  ViewProjection.make({
  name: "booking-views",
  view: BookingView,
  registry,
  when: {
    BookingRequested: (event, store) =>
      Effect.flatMap(profileOf(event.customerId), (profile) =>
        store.upsert({
          id: event.bookingId,
          customerId: event.customerId,
          customerEmail: profile.email ?? "",
          status: "quotation-requested",
          villaId: event.villaId,
          villaName: event.villaName,
          fromDay: event.from,
          toDay: event.to,
          adultsCount: event.adultsCount,
          childrenCount: event.childrenCount,
          nights: event.nights,
          totalAmount: event.pricing.totalAmount,
          unrankedTouristTax: event.pricing.unrankedTouristTax,
          rankedTouristTax: event.pricing.rankedTouristTax,
          depositAmount: event.pricing.depositAmount,
          householdAmount: event.pricing.householdAmount,
          rejected: false,
        }),
      ).pipe(Effect.orDie),
    QuotationGenerated: (event, store) =>
      store
        .patch(event.bookingId, {
          pdfPath: event.pdfPath,
          status: "quotation-awaiting-acceptation",
        })
        .pipe(Effect.orDie),
    QuotationSigned: (event, store) =>
      store
        .patch(event.bookingId, {
          signedFileName: event.fileName,
          status: "quotation-signed",
        })
        .pipe(Effect.orDie),
    QuotationValidated: (event, store) =>
      store.patch(event.bookingId, { status: "contract-sent" }).pipe(Effect.orDie),
    QuotationRejected: (event, store) =>
      store.patch(event.bookingId, { rejected: true }).pipe(Effect.orDie),
  },
})

export const profileViews: ViewProjection.ViewProjection<AppEvent, never, SqlClient.SqlClient> =
  ViewProjection.make({
  name: "profile-views",
  view: CustomerProfileView,
  registry,
  when: {
    ProfileSaved: (event, store) =>
      store
        .upsert({
          id: event.customerId,
          email: event.email,
          firstname: event.firstname,
          lastname: event.lastname,
          phoneNumber: event.phoneNumber,
          language: event.language,
          line1: event.line1,
          line2: event.line2,
          line3: event.line3,
        })
        .pipe(Effect.orDie),
  },
})

// ---------------------------------------------------------------------------
// Availability: an overlap query over this context's own view table. The
// typed store only supports equality criteria, so this one query is
// hand-written SQL. Active bookings block their date range; a rejected
// quotation releases its dates.
// ---------------------------------------------------------------------------

export const isVillaAvailable = (villaId: string, from: string, to: string) =>
  Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.flatMap(
      sql`
        SELECT COUNT(*) AS conflicts FROM booking_view
        WHERE villa_id = ${villaId}
          AND from_day < ${to}
          AND to_day > ${from}
          AND rejected = false
      `,
      (rows) => {
        const row = (rows as unknown as ReadonlyArray<{ conflicts: number | string }>)[0]
        return Effect.succeed(row === undefined || Number(row.conflicts) === 0)
      },
    ),
  )

// ---------------------------------------------------------------------------
// Notifications: emails sent from booking events, rendered from the shared
// templates in mail/ (text + designed HTML). Each email is deduplicated
// by event id through the inbox and suppressed on rebuilds (`live === false`),
// so replays never resend and a crash between "decided" and "sent" retries.
// ---------------------------------------------------------------------------

/** The customer area, where quotations are read, signed and uploaded. */
const customerAreaUrl = (baseUrl: URL): string => new URL("/espace-client", baseUrl).toString()

/** Authoritative booking state — never depends on projection progress. */
const bookingOf = (bookingId: string) =>
  Effect.flatMap(AggregateStore.make(Booking, bookingRegistry), (store) =>
    store.load(BookingId.make(bookingId)).pipe(Effect.orDie),
  )

export const notifications: Projection.Projection<AppEvent, never, Mailer | Inbox | DomainConfigTag | EventStore> =
  Projection.make({
  name: "notifications",
  registry,
  when: {
    BookingRequested: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("notifications", stored.metadata.eventId)(
        Effect.gen(function* () {
          const config = yield* DomainConfigTag
          const profile = yield* profileOf(event.customerId).pipe(Effect.orDie)
          const mailer = yield* Mailer

          yield* mailer.send(
            renderMail(
              config.adminMail,
              quotationRequestAdminMail({
                bookingId: event.bookingId,
                customerName: `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim(),
                customerEmail: profile.email ?? "",
                details: event,
                message: event.message,
              }),
            ),
          )
          yield* mailer.send(
            renderMail(
              profile.email ?? "",
              quotationRequestCustomerMail({ firstname: profile.firstname ?? "", details: event }),
            ),
          )
        }),
      ).pipe(Effect.asVoid)
    },
    QuotationGenerated: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("notifications", stored.metadata.eventId)(
        Effect.gen(function* () {
          const config = yield* DomainConfigTag
          const { state } = yield* bookingOf(event.bookingId)
          const profile = yield* profileOf(state.customerId ?? "").pipe(Effect.orDie)
          const mailer = yield* Mailer
          yield* mailer.send(
            renderMail(
              profile.email ?? "",
              quotationReadyMail({
                firstname: profile.firstname ?? "",
                customerAreaUrl: customerAreaUrl(config.baseUrl),
              }),
            ),
          )
        }),
      ).pipe(Effect.asVoid)
    },
    QuotationSigned: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("notifications", stored.metadata.eventId)(
        Effect.gen(function* () {
          const config = yield* DomainConfigTag
          const mailer = yield* Mailer
          yield* mailer.send(
            renderMail(
              config.adminMail,
              quotationSignedAdminMail({ bookingId: event.bookingId, fileName: event.fileName }),
            ),
          )
        }),
      ).pipe(Effect.asVoid)
    },
    // The owner's decision reaches the customer: a validation confirms the
    // stay (contract and payment terms follow), a rejection explains why —
    // quoting the reason the owner gave.
    QuotationValidated: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("notifications", stored.metadata.eventId)(
        Effect.gen(function* () {
          const { state } = yield* bookingOf(event.bookingId)
          const profile = yield* profileOf(state.customerId ?? "").pipe(Effect.orDie)
          const mailer = yield* Mailer
          yield* mailer.send({
            to: profile.email ?? "",
            subject: "Votre réservation est confirmée — Villa Pointe Savanne",
            body: mailBody([
              `Bonjour ${profile.firstname ?? ""},`,
              "",
              `Bonne nouvelle : votre devis (réservation ${event.bookingId}) a été validé.`,
              ...(state.from !== undefined && state.to !== undefined
                ? [`Séjour confirmé du ${dates.format(dates.parse(state.from))} au ${dates.format(dates.parse(state.to))}.`]
                : []),
              ...(state.pricing !== undefined
                ? [`Acompte à régler : ${formatEuros(state.pricing.depositAmount)}`]
                : []),
              "",
              "Le contrat et les modalités de paiement de l'acompte vous sont adressés ;",
              "votre séjour est réservé aux dates convenues.",
            ]),
          })
        }),
      ).pipe(Effect.asVoid)
    },
    QuotationRejected: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("notifications", stored.metadata.eventId)(
        Effect.gen(function* () {
          const { state } = yield* bookingOf(event.bookingId)
          const profile = yield* profileOf(state.customerId ?? "").pipe(Effect.orDie)
          const mailer = yield* Mailer
          yield* mailer.send({
            to: profile.email ?? "",
            subject: "Votre demande de devis — Villa Pointe Savanne",
            body: mailBody([
              `Bonjour ${profile.firstname ?? ""},`,
              "",
              `Votre devis (réservation ${event.bookingId}) n'a malheureusement pas pu être validé.`,
              ...(event.reason !== "" ? ["", `Motif : ${event.reason}`] : []),
              "",
              "Nous restons à votre disposition pour étudier d'autres dates ou modalités.",
            ]),
          })
        }),
      ).pipe(Effect.asVoid)
    },
  },
})

// ---------------------------------------------------------------------------
// The quotation generator: reacts to BookingRequested by dispatching the
// GenerateQuotation command (which renders + stores the PDF and advances the
// aggregate). Idempotent through the inbox and tolerant of an
// already-generated booking, so at-least-once delivery never wedges it.
// ---------------------------------------------------------------------------

export const quotationGenerator: Projection.Projection<AppEvent, never, Inbox | CommandBus> = {
  name: "quotation-generator",
  registry,
  when: {
    BookingRequested: (event, stored, ctx) => {
      if (!ctx.live) return Effect.void
      return Inbox.dedupe("quotation-generator", stored.metadata.eventId)(
        asSystem(
          Effect.flatMap(CommandBus, (bus) =>
            bus
              .dispatch(GenerateQuotation, { bookingId: event.bookingId })
              .pipe(
                Effect.catchTag("InvariantViolation", () => Effect.void),
                Effect.orDie,
              ),
          ),
        ),
      ).pipe(Effect.asVoid)
    },
  },
}

/** Every projection that runs in the application's worker loop. */
// deno-lint-ignore no-explicit-any
export const allProjections: ReadonlyArray<Projection.Projection<AppEvent, never, any>> = [
  bookingViews.projection,
  profileViews.projection,
  notifications,
  quotationGenerator,
]

/** Processes every projection to the head — used by tests and the worker. */
export const runWorkersOnce = Effect.forEach(allProjections, (projection) => Projection.catchup(projection), {
  discard: true,
})
