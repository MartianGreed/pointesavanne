import {
  cleanStay,
  todayIso,
  type ContactState,
  type StayState,
} from "./form-state"

/**
 * Browser storage for the quotation funnel (agreed rules):
 *
 * - sessionStorage `vcj_stay` — arrival/departure/guests, per session only
 *   (D3); a stale arrival is dropped on read.
 * - sessionStorage `vcj_devis_intent` — set when an anonymous visitor submits
 *   the quotation form; login consumes it to bring the user straight back.
 * - localStorage `vcj_contact` — prénom/nom/e-mail/téléphone so a returning
 *   visitor never retypes them; wiped on sign-out (D1).
 *
 * Every entry point is SSR-guarded; during server rendering these are no-ops.
 */

const STAY_KEY = "vcj_stay"
const INTENT_KEY = "vcj_devis_intent"
const CONTACT_KEY = "vcj_contact"

const readJson = (storage: Storage | null, key: string): Record<string, string> => {
  if (storage === null) return {}
  try {
    const raw = storage.getItem(key)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string")
        .map(([field, value]) => [field, value as string]),
    )
  } catch {
    return {}
  }
}

const writeJson = (storage: Storage | null, key: string, value: unknown): void => {
  if (storage === null) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode / quota exceeded: prefill is a nicety, never a blocker.
  }
}

const session = (): Storage | null => (typeof window === "undefined" ? null : window.sessionStorage)
const local = (): Storage | null => (typeof window === "undefined" ? null : window.localStorage)

/** The stored stay, cleaned of a passed arrival date. */
export const readStay = (): StayState => {
  const raw = readJson(session(), STAY_KEY)
  return cleanStay(
    { arrivee: raw["arrivee"] ?? "", depart: raw["depart"] ?? "", voyageurs: raw["voyageurs"] ?? "2" },
    todayIso(),
  )
}

export const writeStay = (stay: StayState): void => {
  if (stay.arrivee === "" && stay.depart === "") {
    writeJson(session(), STAY_KEY, { voyageurs: stay.voyageurs })
    return
  }
  writeJson(session(), STAY_KEY, { arrivee: stay.arrivee, depart: stay.depart, voyageurs: stay.voyageurs })
}

/** Stored contact details (partial — merged over the profile by the page). */
export const readContact = (): Partial<ContactState> => {
  const raw = readJson(local(), CONTACT_KEY)
  const pick = (field: string): string | undefined => {
    const value = raw[field]
    return value !== undefined && value !== "" ? value : undefined
  }
  return { prenom: pick("prenom"), nom: pick("nom"), email: pick("email"), tel: pick("tel") }
}

export const writeContact = (contact: ContactState): void => {
  writeJson(local(), CONTACT_KEY, contact)
}

/** D1: sign-out wipes the PII, nothing else. */
export const clearContact = (): void => {
  const storage = local()
  if (storage === null) return
  try {
    storage.removeItem(CONTACT_KEY)
  } catch {
    // ignore
  }
}

export const setDevisIntent = (): void => {
  const storage = session()
  if (storage === null) return
  try {
    storage.setItem(INTENT_KEY, "1")
  } catch {
    // ignore
  }
}

/** True (and consumed) exactly once when a sign-in should return to /devis. */
export const takeDevisIntent = (): boolean => {
  const storage = session()
  if (storage === null) return false
  try {
    if (storage.getItem(INTENT_KEY) !== "1") return false
    storage.removeItem(INTENT_KEY)
    return true
  } catch {
    return false
  }
}
