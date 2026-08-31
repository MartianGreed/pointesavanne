import { Injectable, computed, signal } from "@angular/core"
import { EMPTY_CONTACT, EMPTY_STAY, cleanStay, todayIso, type ContactState, type StayState } from "./form-state"

/** What a sign-in's claim did with the pending lead (backend outcome). */
export interface ClaimResult {
  readonly claimed: number
  readonly bookings: ReadonlyArray<{ bookingId: string; status: string; pricing: Record<string, number> }>
  readonly issues: readonly string[]
}

/**
 * The quotation funnel's in-app state — one store shared by the landing, the
 * devis page and the auth pages, replacing every browser-storage read/write.
 *
 * The backend is the source of truth for anything that must outlive the tab:
 * an anonymous "Demander mon devis" submits a QuotationLead server-side, and
 * the claim at sign-in converts it. This store only carries the current
 * session's draft (prefill continuity, registration prefill) and the last
 * claim outcome to surface — it is gone on reload or sign-out (D1: no PII
 * survives the session), by construction.
 */
@Injectable({ providedIn: "root" })
export class QuoteFunnelStore {
  readonly stay = signal<StayState>(EMPTY_STAY)
  readonly contact = signal<ContactState>(EMPTY_CONTACT)
  readonly message = signal("")

  /** A lead was submitted server-side and awaits its claim at sign-in. */
  readonly pendingLead = signal(false)
  /** The outcome of the claim that ran at the last sign-in, if any. */
  readonly claimResult = signal<ClaimResult | null>(null)

  readonly hasPendingFunnel = computed(() => this.pendingLead())

  /** Landing → devis: the stay the visitor just checked. */
  readonly setStay = (stay: StayState): void => {
    this.stay.set(cleanStay(stay, todayIso()))
  }

  /** Devis page edits — always the visitor's freshest intent. */
  readonly patchStay = (stay: StayState): void => {
    this.stay.set(stay)
  }

  readonly patchContact = (contact: ContactState): void => {
    this.contact.set(contact)
  }

  readonly setMessage = (message: string): void => {
    this.message.set(message)
  }

  /** The anonymous devis submit succeeded: the lead lives on the backend. */
  readonly markPendingLead = (): void => {
    this.pendingLead.set(true)
  }

  readonly recordClaim = (result: ClaimResult): void => {
    this.claimResult.set(result)
    if (result.claimed > 0) this.pendingLead.set(false)
  }

  /** Sign-out (D1) and post-claim cleanup: nothing survives the session. */
  readonly reset = (): void => {
    this.stay.set(EMPTY_STAY)
    this.contact.set(EMPTY_CONTACT)
    this.message.set("")
    this.pendingLead.set(false)
    this.claimResult.set(null)
  }
}
