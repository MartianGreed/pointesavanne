import { registerVerifiedCustomer, signInPassword, ddMmYyyyToIso } from "@structure-ai/bdd"
import { Cause, Effect, Exit } from "effect"
import type { DomainWorld, QuotationRequestData } from "../../composition.ts"
import { RequestQuotation, SaveProfile } from "../../../src/messages/index.ts"

/**
 * Shared step machinery: registration/login helpers and quotation
 * submission, built on the auth test kit. Registering a customer means:
 * auth register → email verification (the token is captured by the kit's
 * recording sender) → profile save — mirroring the two-call registration
 * flow of the client application.
 */

export { ddMmYyyyToIso, norm } from "@structure-ai/bdd"

export interface CustomerRow {
  email: string
  password: string
  phoneNumber?: string
  firstname?: string
  lastname?: string
  line1?: string | null
  line2?: string | null
  line3?: string | null
}

/** Registers a verified customer with a saved profile and signs them in. */
export const registerCustomer = (world: DomainWorld, row: CustomerRow): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const id = yield* registerVerifiedCustomer({
      testAuth: world.testAuth,
      email: row.email,
      password: row.password,
      displayName: row.firstname,
    })
    const exit = yield* world.dispatch(
      SaveProfile,
      {
        email: row.email,
        firstname: row.firstname ?? "",
        lastname: row.lastname ?? "",
        phoneNumber: row.phoneNumber ?? "0601020304",
        ...(row.line1 ? { line1: row.line1 } : {}),
        ...(row.line2 ? { line2: row.line2 } : {}),
        ...(row.line3 ? { line3: row.line3 } : {}),
      },
      { actor: id },
    )
    if (Exit.isFailure(exit)) {
      return yield* Effect.die(`profile save failed for ${row.email}: ${String(Cause.squash(exit.cause))}`)
    }
    yield* world.runWorkers()
    world.signIn(row.email, id)
    world.registeredPasswords.set(row.email, row.password)
  })

export const signIn = (world: DomainWorld, email: string): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const known = world.actorNamed(email)
    if (known === undefined) return yield* Effect.die(`customer ${email} must be registered first`)
    const password = world.registeredPasswords.get(email)
    if (password === undefined) return yield* Effect.die(`no password recorded for ${email}`)

    const token = yield* signInPassword({ testAuth: world.testAuth, email, password })
    world.sessions.set(email, token)
    world.signIn(email, known.id)
    world.currentEmail = email
  })

/** Installs the villa the background steps accumulated into the catalog. */
export const installVilla = (world: DomainWorld): void => {
  world.doubles.catalog.set({
    villaId: "villa-de-standing-pointe-savanne",
    name: world.villaName,
    cautionAmount: world.cautionAmount,
    householdAmount: world.householdAmount,
    seasonalRanges: world.seasonalRanges,
    discountRanges: world.discountRanges,
  })
}

/**
 * Submits the quotation request as the given customer. The dispatch exit is
 * recorded by the world: business failures surface on the last outcome for
 * `Then` steps to assert; the quotation result is kept when it succeeds.
 */
export const submitQuotation = (
  world: DomainWorld,
  email: string,
  request: QuotationRequestData,
): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const customer = world.actorNamed(email)
    if (customer === undefined) return yield* Effect.die(`${email} must be registered`)
    installVilla(world)
    const exit = yield* world.dispatch(
      RequestQuotation,
      {
        villaId: "villa-de-standing-pointe-savanne",
        from: ddMmYyyyToIso(request.from),
        to: ddMmYyyyToIso(request.to),
        adultsCount: request.adultsCount,
        childrenCount: request.childrenCount,
      },
      { actor: customer.id },
    )
    if (Exit.isSuccess(exit)) {
      world.quotationResult = exit.value
      world.quotationOwnerId = customer.id
      yield* world.runWorkers()
    }
  })
