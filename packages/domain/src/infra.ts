import { Context, Data, Effect, Layer } from "effect"

// ---------------------------------------------------------------------------
// Mailer port. Production wiring should replace ConsoleMailer with a real
// provider (SES, SMTP relay, ...); tests use the recording layer from test/.
// ---------------------------------------------------------------------------

export interface OutgoingMail {
  readonly to: string
  readonly subject: string
  readonly body: string
}

export class Mailer extends Context.Tag("pointesavanne/Mailer")<Mailer, { readonly send: (mail: OutgoingMail) => Effect.Effect<void> }>() {}

export const ConsoleMailer = Layer.succeed(
  Mailer,
  Mailer.of({
    send: (mail) => Effect.logInfo(`mail to ${mail.to}: ${mail.subject}`).pipe(Effect.annotateLogs("mail", mail)),
  }),
)

// ---------------------------------------------------------------------------
// File store port — where quotation PDFs and signed documents live.
// LocalFileStore keeps them under a base directory; tests record in memory.
// ---------------------------------------------------------------------------

export class FileStore extends Context.Tag("pointesavanne/FileStore")<FileStore, {
  readonly save: (path: string, content: Uint8Array) => Effect.Effect<void>
  readonly read: (path: string) => Effect.Effect<Uint8Array, FileNotFound>
}>() {}

export class FileNotFound extends Data.TaggedError("FileNotFound")<{}> {
  override get message(): string {
    return "File not found"
  }
}

export const LocalFileStore = (baseDir: string): Layer.Layer<FileStore> =>
  Layer.succeed(
    FileStore,
    FileStore.of({
      save: (path, content) => Effect.promise(() => Bun.write(`${baseDir}/${path}`, content)),
      read: (path) =>
        Effect.tryPromise({
          try: () => Bun.file(`${baseDir}/${path}`).bytes(),
          catch: () => new FileNotFound(),
        }),
    }),
  )

// ---------------------------------------------------------------------------
// Quotation PDF port. The current implementation writes the rendered HTML
// quotation (the legacy dompdf pipeline's input) — the file contract (path,
// name, content flow) is real; byte-true PDF rendering is a swap-in later.
// ---------------------------------------------------------------------------

export interface QuotationBookingData {
  readonly bookingId: string
  readonly villaName: string
  readonly from: string
  readonly to: string
  readonly adultsCount: number
  readonly childrenCount: number
  readonly pricing: {
    readonly totalAmount: number
    readonly unrankedTouristTax: number
    readonly rankedTouristTax: number
    readonly depositAmount: number
    readonly householdAmount: number
  }
  readonly customer: { readonly email: string; readonly name: string }
}

export class QuotationPdf extends Context.Tag("pointesavanne/QuotationPdf")<QuotationPdf, {
  readonly render: (booking: QuotationBookingData) => Effect.Effect<Uint8Array>
}>() {}

export const quotationPath = (bookingId: string): string => `booking/${bookingId}/devis.pdf`

/** Where a customer's signed quotation upload lives. */
export const signedDocumentPath = (bookingId: string, fileName: string): string =>
  `booking/${bookingId}/signed/${fileName}`

/**
 * Default adapter: renders the quotation document as HTML (the legacy
 * dompdf pipeline's input); byte-true PDF rendering swaps in behind the
 * port later.
 */
export const HtmlQuotationPdf = Layer.succeed(
  QuotationPdf,
  QuotationPdf.of({
    render: (booking) =>
      Effect.succeed(
        new TextEncoder().encode(
          [
            '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Devis</title></head><body>',
            `<h1>Devis — ${booking.villaName}</h1>`,
            `<p>Client : ${booking.customer.name} (${booking.customer.email})</p>`,
            `<p>Séjour du ${booking.from} au ${booking.to} — ${booking.adultsCount} adulte(s), ${booking.childrenCount} enfant(s)</p>`,
            "<ul>",
            `<li>Total séjour : ${booking.pricing.totalAmount} €</li>`,
            `<li>Taxe touristique (non classé) : ${booking.pricing.unrankedTouristTax} €</li>`,
            `<li>Taxe touristique (classé 4 étoiles) : ${booking.pricing.rankedTouristTax} €</li>`,
            `<li>Caution : ${booking.pricing.depositAmount} €</li>`,
            `<li>Ménage obligatoire : ${booking.pricing.householdAmount} €</li>`,
            "</ul></body></html>",
          ].join("\n"),
        ),
      ),
  }),
)
