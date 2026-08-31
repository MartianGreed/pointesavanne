/**
 * The transactional e-mails themselves. Each one is a pure function from its
 * data to a MailTemplate — no ports, no config lookups — so a template can be
 * rendered and asserted on without standing up the application, and the
 * copy lives in one place instead of inside the projections that send it.
 */

import type { AuthEmail } from "@structure-ai/auth"
import { dates, formatEuros } from "../booking/pricing.ts"
import { brand, subjectOf, type MailBlock, type MailTemplate } from "./layout.ts"

/** The priced stay a quotation e-mail recaps — the shape BookingRequested carries. */
export interface QuotationDetails {
  readonly villaName: string
  /** ISO days, as stored on the booking. */
  readonly from: string
  readonly to: string
  readonly nights: number
  readonly adultsCount: number
  readonly childrenCount: number
  readonly pricing: {
    readonly totalAmount: number
    readonly unrankedTouristTax: number
    readonly rankedTouristTax: number
    readonly depositAmount: number
    readonly householdAmount: number
  }
}

const occupancyOf = (details: QuotationDetails): string =>
  `${details.adultsCount} adulte(s), ${details.childrenCount} enfant(s)`

const stayBlock = (details: QuotationDetails): MailBlock => ({
  _tag: "Summary",
  title: "Votre séjour",
  rows: [
    { label: "Villa", value: details.villaName },
    {
      label: "Dates",
      value: `du ${dates.format(dates.parse(details.from))} au ${dates.format(dates.parse(details.to))} (${details.nights} nuits)`,
    },
    { label: "Occupants", value: occupancyOf(details) },
  ],
})

const pricingBlock = (details: QuotationDetails): MailBlock => ({
  _tag: "Summary",
  title: "Estimation",
  rows: [
    { label: "Taxe de séjour (non classé)", value: formatEuros(details.pricing.unrankedTouristTax) },
    { label: "Taxe de séjour (classé 4 étoiles)", value: formatEuros(details.pricing.rankedTouristTax) },
    { label: "Ménage obligatoire", value: formatEuros(details.pricing.householdAmount) },
    { label: "Caution", value: formatEuros(details.pricing.depositAmount) },
    { label: "Total séjour", value: formatEuros(details.pricing.totalAmount), emphasis: true },
  ],
})

/** "Bonjour Marie," — or plain "Bonjour," when the profile has no firstname. */
const greeting = (firstname: string): MailBlock => ({
  _tag: "Paragraph",
  text: firstname.trim().length === 0 ? "Bonjour," : `Bonjour ${firstname.trim()},`,
})

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export interface QuotationRequestAdminMail {
  readonly bookingId: string
  readonly customerName: string
  readonly customerEmail: string
  readonly details: QuotationDetails
  readonly message?: string | undefined
}

/** Internal notification: a visitor just asked for a quotation. */
export const quotationRequestAdminMail = (data: QuotationRequestAdminMail): MailTemplate => ({
  subject: `Nouvelle demande de devis — ${data.bookingId}`,
  preheader: `${data.customerName} — ${data.details.nights} nuits, ${formatEuros(data.details.pricing.totalAmount)}`,
  kicker: "Demande de devis",
  title: "Une nouvelle demande vient d'arriver",
  blocks: [
    {
      _tag: "Paragraph",
      text: `${data.customerName} (${data.customerEmail}) a demandé un devis.`,
    },
    stayBlock(data.details),
    pricingBlock(data.details),
    ...(data.message === undefined || data.message.trim().length === 0
      ? []
      : [{ _tag: "Quote", label: "Message du client", text: data.message } as const]),
    { _tag: "Divider" },
    { _tag: "Summary", rows: [{ label: "Référence", value: data.bookingId }] },
  ],
})

export interface QuotationRequestCustomerMail {
  readonly firstname: string
  readonly details: QuotationDetails
}

/** Acknowledgement to the guest, recapping what they asked for. */
export const quotationRequestCustomerMail = (data: QuotationRequestCustomerMail): MailTemplate => ({
  subject: subjectOf("Votre demande de devis"),
  preheader: `Nous avons bien reçu votre demande pour ${data.details.nights} nuits.`,
  kicker: "Demande reçue",
  title: "Nous avons bien reçu votre demande",
  blocks: [
    greeting(data.firstname),
    { _tag: "Paragraph", text: "Merci de votre intérêt pour la villa. Voici le récapitulatif de votre demande :" },
    stayBlock(data.details),
    pricingBlock(data.details),
    {
      _tag: "Note",
      tone: "info",
      text: "Ce montant est une estimation. Votre devis définitif vous parviendra très rapidement.",
    },
    { _tag: "Paragraph", text: "À très bientôt en Martinique." },
  ],
})

export interface QuotationReadyMail {
  readonly firstname: string
  readonly customerAreaUrl: string
}

/** The quotation has been generated and waits in the customer area. */
export const quotationReadyMail = (data: QuotationReadyMail): MailTemplate => ({
  subject: subjectOf("Votre devis est disponible"),
  preheader: "Votre devis vous attend dans votre espace client.",
  kicker: "Votre devis",
  title: "Votre devis est prêt",
  blocks: [
    greeting(data.firstname),
    {
      _tag: "Paragraph",
      text: "Votre devis est disponible dans votre espace client. Vous pouvez le consulter et le télécharger dès maintenant.",
    },
    { _tag: "Button", label: "Voir mon devis", url: data.customerAreaUrl },
    {
      _tag: "Note",
      tone: "info",
      text: "Pour confirmer votre séjour, merci de signer le devis puis de le téléverser depuis votre espace client.",
    },
  ],
})

export interface QuotationSignedAdminMail {
  readonly bookingId: string
  readonly fileName: string
}

/** Internal notification: a signed quotation just landed. */
export const quotationSignedAdminMail = (data: QuotationSignedAdminMail): MailTemplate => ({
  subject: `Devis signé — ${data.bookingId}`,
  preheader: `Document reçu : ${data.fileName}`,
  kicker: "Devis signé",
  title: "Un client a signé son devis",
  blocks: [
    { _tag: "Paragraph", text: "Le devis signé a été téléversé depuis l'espace client." },
    {
      _tag: "Summary",
      rows: [
        { label: "Document", value: data.fileName },
        { label: "Réservation", value: data.bookingId },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Authentication — one-time links issued by @structure-ai/auth.
// ---------------------------------------------------------------------------

interface AuthCopy {
  readonly subject: string
  readonly kicker: string
  readonly title: string
  readonly lead: string
  readonly action: string
}

const authCopy: Record<AuthEmail["kind"], AuthCopy> = {
  "email-verification": {
    subject: "Vérifiez votre adresse e-mail",
    kicker: "Bienvenue",
    title: "Confirmez votre adresse e-mail",
    lead: `Bienvenue à la ${brand.name}. Il ne reste qu'une étape : confirmer votre adresse e-mail pour activer votre espace client.`,
    action: "Confirmer mon adresse",
  },
  "password-reset": {
    subject: "Réinitialisation de votre mot de passe",
    kicker: "Sécurité",
    title: "Réinitialisez votre mot de passe",
    lead: "Vous avez demandé à réinitialiser votre mot de passe. Choisissez-en un nouveau en suivant le lien ci-dessous.",
    action: "Choisir un nouveau mot de passe",
  },
  "magic-link": {
    subject: "Votre lien de connexion",
    kicker: "Connexion",
    title: "Votre lien de connexion",
    lead: "Voici votre lien de connexion à usage unique. Il vous ouvre directement votre espace client.",
    action: "Me connecter",
  },
}

/** Expiries read like a date, not like a timestamp: "01/09/2026 à 05:32 (UTC)". */
const expiryOf = (expiresAt: Date): string => {
  const hours = String(expiresAt.getUTCHours()).padStart(2, "0")
  const minutes = String(expiresAt.getUTCMinutes()).padStart(2, "0")
  return `${dates.format(expiresAt)} à ${hours}:${minutes} (UTC)`
}

/**
 * The one-time-link e-mails. `url` is passed in rather than read off the
 * AuthEmail because the domain rewrites the library's /auth/* paths onto the
 * SPA's landing routes first.
 */
export const authMail = (email: AuthEmail, url: string): MailTemplate => {
  const copy = authCopy[email.kind]
  return {
    subject: subjectOf(copy.subject),
    preheader: copy.lead,
    kicker: copy.kicker,
    title: copy.title,
    blocks: [
      { _tag: "Paragraph", text: copy.lead },
      { _tag: "Button", label: copy.action, url },
      {
        _tag: "Note",
        tone: "info",
        text: `Ce lien expire le ${expiryOf(email.expiresAt)} et ne peut servir qu'une fois.`,
      },
      {
        _tag: "Paragraph",
        text: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.",
      },
    ],
  }
}
