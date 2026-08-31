import { describe, expect, test } from "bun:test"
import { QuoteFunnelStore } from "./quote-funnel.store"

describe("QuoteFunnelStore", () => {
  test("setStay drops a passed arrival but keeps the guest count", () => {
    const store = new QuoteFunnelStore()
    store.setStay({ arrivee: "2020-01-02", depart: "2020-01-09", voyageurs: "4" })
    expect(store.stay()).toEqual({ arrivee: "", depart: "", voyageurs: "4" })
  })

  test("the anonymous funnel: submit → pending lead → claim converts it", () => {
    const store = new QuoteFunnelStore()
    store.patchContact({ prenom: "Marie", nom: "Dupont", email: "marie@mail.com", tel: "" })
    store.markPendingLead()
    expect(store.hasPendingFunnel()).toBe(true)

    store.recordClaim({ claimed: 1, bookings: [{ bookingId: "b1", status: "quotation-requested", pricing: {} }], issues: [] })
    expect(store.pendingLead()).toBe(false)
    expect(store.claimResult()?.claimed).toBe(1)
  })

  test("a claim that consumed the lead with issues still clears the pending flag", () => {
    const store = new QuoteFunnelStore()
    store.markPendingLead()
    store.recordClaim({ claimed: 1, bookings: [], issues: ["Booking is unavailable for dates 30/05/2022 - 13/06/2022"] })
    expect(store.pendingLead()).toBe(false)
    expect(store.claimResult()?.issues).toHaveLength(1)
  })

  test("reset wipes the draft and the funnel flags — nothing survives the session", () => {
    const store = new QuoteFunnelStore()
    store.setStay({ arrivee: "2099-05-30", depart: "2099-06-13", voyageurs: "4" })
    store.patchContact({ prenom: "Marie", nom: "Dupont", email: "marie@mail.com", tel: "06" })
    store.setMessage("Bonjour")
    store.markPendingLead()
    store.recordClaim({ claimed: 1, bookings: [], issues: [] })
    store.reset()
    expect(store.stay()).toEqual({ arrivee: "", depart: "", voyageurs: "2" })
    expect(store.contact()).toEqual({ prenom: "", nom: "", email: "", tel: "" })
    expect(store.message()).toBe("")
    expect(store.pendingLead()).toBe(false)
    expect(store.claimResult()).toBeNull()
  })
})
