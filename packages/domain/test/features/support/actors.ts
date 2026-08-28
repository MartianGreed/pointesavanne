import { CommandBus } from "@structure-ai/cqrs"
import { Effect, Redacted } from "effect"
import type { CucumberWorld } from "./world.ts"
import { SaveProfile } from "../../../src/messages/index.ts"
import { TENANT_ID } from "../../../src/policy.ts"

/**
 * Shared registration/login helpers for the step definitions. Registering a
 * customer in this suite means: auth register → email verification (the
 * token is captured from the recording sender) → profile save. This mirrors
 * the two-call registration flow of the client application.
 */
export const registerCustomer = async (
  world: CucumberWorld,
  row: {
    email: string
    password: string
    phoneNumber?: string
    firstname?: string
    lastname?: string
    line1?: string | null
    line2?: string | null
    line3?: string | null
  },
) => {
  const w = await world.ensure()
  const emailsBefore = w.doubles.authEmails.length

  const registered = await w.attempt(
    w.doubles.auth.registerPassword({
      tenantId: TENANT_ID,
      email: row.email,
      password: row.password,
      displayName: row.firstname,
    }),
  )
  if (!registered.ok) throw new Error(`registration failed for ${row.email}: ${String(registered.error)}`)
  const user = registered.value

  const verification = w.doubles.authEmails
    .slice(emailsBefore)
    .find((email) => email.kind === "email-verification" && email.to === row.email)
  if (verification === undefined) throw new Error(`no verification email captured for ${row.email}`)
  await w.run(w.doubles.auth.verifyEmail(TENANT_ID, Redacted.make(verification.token)))

  await w.run(
    Effect.gen(function* () {
      const bus = yield* CommandBus
      yield* bus.dispatch(
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
        { actor: user.id },
      )
    }) as never,
  )
  await w.runWorkers()

  world.customers.set(row.email, { userId: user.id })
  world.registeredPasswords.set(row.email, row.password)
  return user.id
}

export const signIn = async (world: CucumberWorld, email: string) => {
  const w = await world.ensure()
  const known = world.customers.get(email)
  if (known === undefined) throw new Error(`customer ${email} must be registered first`)
  const password = world.registeredPasswords.get(email)
  if (password === undefined) throw new Error(`no password recorded for ${email}`)

  const session = await w.run(w.doubles.auth.signInPassword(TENANT_ID, email, password))
  world.sessions.set(email, Redacted.value(session.token))
  world.currentEmail = email
  return { userId: known.userId, session }
}
