import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Aggregate } from "@structure-ai/domain"
import { Booking, BookingId, type BookingCommand } from "../src/booking/booking.ts"
import { defaultVilla } from "../src/catalog.ts"

describe("Booking aggregate (decider)", () => {
  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect)
  const fail = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect))

  const requestCommand = (from: string, to: string): BookingCommand => ({
    _tag: "RequestBooking",
    id: BookingId.generate(),
    customerId: "customer-1",
    villa: defaultVilla,
    from,
    to,
    adultsCount: 4,
    childrenCount: 2,
  })

  test("accepts a valid request and emits the priced event", async () => {
    const command = requestCommand("2022-05-30", "2022-06-13")
    const result = await run(Aggregate.execute(Booking, Booking.initial, command))
    expect(result.events).toHaveLength(1)
    const event = result.events[0]!
    if (event._tag !== "BookingRequested") throw new Error("expected BookingRequested")
    expect(event.pricing.totalAmount).toBe(3040)
    expect(result.state.status).toBe("quotation-requested")
  })

  test("rejects an end date before the start date with the legacy message", async () => {
    const error = await fail(Aggregate.execute(Booking, Booking.initial, requestCommand("2022-05-30", "2022-05-13")))
    expect(error._tag).toBe("ValidationFailed")
    expect((error as { issues: ReadonlyArray<string> }).issues[0]).toBe(
      "End date 13/05/2022 cannot be before start date 30/05/2022",
    )
  })

  test("rejects dates outside every seasonal range", async () => {
    // Far beyond the card's rolling horizon (currentYear + 2) on purpose:
    // the card now projects forward, so a near-future year would go stale.
    const error = await fail(Aggregate.execute(Booking, Booking.initial, requestCommand("2099-01-06", "2099-01-13")))
    expect(error._tag).toBe("ValidationFailed")
  })

  test("walks the quotation lifecycle: requested → generated → signed → contract", async () => {
    const request = requestCommand("2022-05-30", "2022-06-13")
    let state = Booking.initial

    const afterRequest = await run(Aggregate.execute(Booking, state, request))
    state = afterRequest.state

    const id = request.id
    const afterGenerated = await run(Aggregate.execute(Booking, state, { _tag: "GenerateQuotation", id, pdfPath: "booking/x/devis.pdf" }))
    expect(afterGenerated.state.status).toBe("quotation-awaiting-acceptation")
    state = afterGenerated.state

    const afterSigned = await run(Aggregate.execute(Booking, state, { _tag: "SignQuotation", id, fileName: "signed.pdf" }))
    expect(afterSigned.state.status).toBe("quotation-signed")
    state = afterSigned.state

    const afterValidated = await run(Aggregate.execute(Booking, state, { _tag: "ValidateQuotation", id, accepted: true, validatedBy: "owner" }))
    expect(afterValidated.state.status).toBe("contract-sent")
  })

  test("refuses signing before a quotation exists", async () => {
    const error = await fail(
      Aggregate.execute(Booking, Booking.initial, { _tag: "SignQuotation", id: BookingId.generate(), fileName: "signed.pdf" }),
    )
    expect(error._tag).toBe("InvariantViolation")
  })

  test("rehydrates from an event history", async () => {
    const command = requestCommand("2022-05-30", "2022-06-13")
    const result = await run(Aggregate.execute(Booking, Booking.initial, command))
    const rehydrated = Aggregate.rehydrate(Booking, result.events)
    expect(rehydrated.status).toBe("quotation-requested")
    expect(rehydrated.nights).toBe(14)
  })
})
