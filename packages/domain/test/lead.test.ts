import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Aggregate } from "@structure-ai/domain"
import { QuotationLead, leadIdOf, type LeadCommand } from "../src/lead/lead.ts"

describe("QuotationLead aggregate (decider)", () => {
  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect)
  const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect))

  const id = leadIdOf("Marie.Dupont@Mail.com")
  const submit = (over: Partial<Extract<LeadCommand, { _tag: "SubmitLead" }>> = {}): LeadCommand => ({
    _tag: "SubmitLead",
    id,
    email: "marie.dupont@mail.com",
    firstname: "Marie",
    lastname: "Dupont",
    phoneNumber: "+596 696 12 34 56",
    villaId: "villa-de-standing-pointe-savanne",
    from: "2022-05-30",
    to: "2022-06-13",
    adultsCount: 4,
    childrenCount: 0,
    ...over,
  })

  test("the lead id is the normalized e-mail — one stream per visitor intent", () => {
    expect(String(leadIdOf("  Marie.Dupont@Mail.COM "))).toBe("lead:marie.dupont@mail.com")
  })

  test("a submission is recorded and the message rides along only when present", async () => {
    const result = await run(Aggregate.execute(QuotationLead, QuotationLead.initial, submit({ message: "Lit bébé svp" })))
    expect(result.events).toHaveLength(1)
    const event = result.events[0]!
    if (event._tag !== "LeadSubmitted") throw new Error("expected LeadSubmitted")
    expect(event.message).toBe("Lit bébé svp")
    expect(result.state.status).toBe("submitted")
    expect(result.state.message).toBe("Lit bébé svp")
  })

  test("a newer submission supersedes the pending one — freshest intent wins", async () => {
    const first = await run(Aggregate.execute(QuotationLead, QuotationLead.initial, submit()))
    const second = await run(
      Aggregate.execute(QuotationLead, first.state, submit({ from: "2022-07-02", to: "2022-07-16" })),
    )
    const event = second.events[0]!
    if (event._tag !== "LeadSubmitted") throw new Error("expected LeadSubmitted")
    expect(event.from).toBe("2022-07-02")
    expect(second.state.from).toBe("2022-07-02")
    expect(second.state.status).toBe("submitted")
  })

  test("a submitted lead can be claimed, carrying the reserved booking id", async () => {
    const afterSubmit = await run(Aggregate.execute(QuotationLead, QuotationLead.initial, submit()))
    const afterClaim = await run(
      Aggregate.execute(QuotationLead, afterSubmit.state, {
        _tag: "ClaimLead",
        id,
        customerId: "customer-1",
        bookingId: "booking-9",
      }),
    )
    const event = afterClaim.events[0]!
    if (event._tag !== "LeadClaimed") throw new Error("expected LeadClaimed")
    expect(event.customerId).toBe("customer-1")
    expect(event.bookingId).toBe("booking-9")
    expect(afterClaim.state.status).toBe("claimed")
    expect(afterClaim.state.claimedBy).toBe("customer-1")
  })

  test("claiming twice is rejected — a concurrent claim cannot double-convert", async () => {
    const afterSubmit = await run(Aggregate.execute(QuotationLead, QuotationLead.initial, submit()))
    const afterClaim = await run(
      Aggregate.execute(QuotationLead, afterSubmit.state, { _tag: "ClaimLead", id, customerId: "customer-1" }),
    )
    const error = await fail(
      Aggregate.execute(QuotationLead, afterClaim.state, { _tag: "ClaimLead", id, customerId: "customer-2" }),
    )
    expect(error._tag).toBe("InvariantViolation")
  })

  test("a claimed lead may be re-submitted — the visitor came back for a new devis", async () => {
    const afterSubmit = await run(Aggregate.execute(QuotationLead, QuotationLead.initial, submit()))
    const afterClaim = await run(
      Aggregate.execute(QuotationLead, afterSubmit.state, { _tag: "ClaimLead", id, customerId: "customer-1" }),
    )
    const resubmitted = await run(Aggregate.execute(QuotationLead, afterClaim.state, submit({ adultsCount: 2 })))
    expect(resubmitted.state.status).toBe("submitted")
    expect(resubmitted.state.adultsCount).toBe(2)
    expect(resubmitted.state.claimedBy).toBeUndefined()
  })
})
