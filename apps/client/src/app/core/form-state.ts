/**
 * Quotation-form state: priorities and staleness rules.
 * Pure and DOM-free so the merge logic stays unit-tested; the in-session
 * carrier is the QuoteFunnelStore (an Angular service), and the durable
 * record of an anonymous request is the backend's quotation lead.
 *
 * Priority rule (agreed): the freshest intent wins —
 *   stay:      query params (just came from the landing) > funnel store > defaults
 *   contact:   funnel store > profile (fills the gaps only)
 */

export interface StayState {
  readonly arrivee: string
  readonly depart: string
  readonly voyageurs: string
}

export interface ContactState {
  readonly prenom: string
  readonly nom: string
  readonly email: string
  readonly tel: string
}

export const EMPTY_STAY: StayState = { arrivee: "", depart: "", voyageurs: "2" }
export const EMPTY_CONTACT: ContactState = { prenom: "", nom: "", email: "", tel: "" }

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Whole nights between two ISO days; 0 when the range is empty or invalid. */
export const nightsBetween = (from: string, to: string): number => {
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to)) return 0
  const nights = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
  return nights > 0 ? nights : 0
}

/**
 * Per-session staleness rule: a stay whose arrival already passed is a past
 * intent — drop the dates, keep the guest count.
 */
export const cleanStay = (stay: StayState, today: string): StayState => {
  const voyageurs = Number(stay.voyageurs)
  return {
    arrivee: stay.arrivee < today && ISO_DAY.test(stay.arrivee) ? "" : stay.arrivee,
    depart: stay.arrivee < today && ISO_DAY.test(stay.arrivee) ? "" : stay.depart,
    voyageurs: Number.isFinite(voyageurs) && voyageurs >= 1 && voyageurs <= 8 ? String(voyageurs) : "2",
  }
}

/** Fills the gaps of `base` with `fallback` — `base` wins field by field. */
export const fillStayGaps = (base: StayState, fallback: StayState): StayState => ({
  arrivee: base.arrivee !== "" ? base.arrivee : fallback.arrivee,
  depart: base.depart !== "" ? base.depart : fallback.depart,
  voyageurs: base.voyageurs !== "" ? base.voyageurs : fallback.voyageurs,
})

/** Query params for the landing → devis handoff (shareable, SSR-safe). */
export const stayQueryParams = (stay: StayState): Record<string, string> => {
  const params: Record<string, string> = {}
  if (stay.arrivee !== "") params["arrivee"] = stay.arrivee
  if (stay.depart !== "") params["depart"] = stay.depart
  if (stay.voyageurs !== "") params["voyageurs"] = stay.voyageurs
  return params
}

/** Same field-by-field rule for contact details (localStorage > profile). */
export const fillContactGaps = (base: Partial<ContactState>, fallback: Partial<ContactState>): ContactState => ({
  prenom: base.prenom ?? fallback.prenom ?? "",
  nom: base.nom ?? fallback.nom ?? "",
  email: base.email ?? fallback.email ?? "",
  tel: base.tel ?? fallback.tel ?? "",
})

/** Today as an ISO day, computed once per call site (testable). */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
