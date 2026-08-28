import { Given, Then, When, type StepContext } from "@structure-ai/bdd"
import { Effect, Exit, Redacted, Schema } from "effect"
import type { DomainWorld } from "../../composition.ts"
import { SaveProfile } from "../../../src/messages/index.ts"
import { TENANT_ID } from "../../../src/policy.ts"
import { registerCustomer, signIn, type CustomerRow } from "./support.ts"

type Ctx<P extends readonly unknown[]> = StepContext<DomainWorld, P>

/** A customer fixture row; `NULL` cells decode to null (see `nullLiteral`). */
const customerRow = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  phoneNumber: Schema.optional(Schema.String),
  firstname: Schema.optional(Schema.String),
  lastname: Schema.optional(Schema.String),
  line1: Schema.optional(Schema.NullOr(Schema.String)),
  line2: Schema.optional(Schema.NullOr(Schema.String)),
  line3: Schema.optional(Schema.NullOr(Schema.String)),
})

const profileRow = Schema.Struct({
  language: Schema.optional(Schema.String),
  firstname: Schema.optional(Schema.String),
  lastname: Schema.optional(Schema.String),
  line1: Schema.optional(Schema.String),
  line3: Schema.optional(Schema.String),
})

const resetEmailSentTo = (world: DomainWorld, email: string, since: number) =>
  world.testAuth.emails.slice(since).find((sent) => sent.kind === "password-reset" && sent.to === email)

export const customerSteps = [
  // --- shared givens -----------------------------------------------------------

  Given('a set of customers are already registered:', ({ world, table }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const rows = table !== undefined ? yield* table.rows(customerRow, { nullLiteral: "NULL" }) : []
      for (const row of rows satisfies ReadonlyArray<CustomerRow>) yield* registerCustomer(world, row)
    }),
  ),

  Given('{string} is logged in', ({ world, params }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const [email] = params
      if (world.actorNamed(email) === undefined) {
        yield* registerCustomer(world, {
          email,
          password: "v@lent1n",
          phoneNumber: "0601020304",
          firstname: email.split("@")[0]!,
          lastname: "Dosimont",
        })
      }
      yield* signIn(world, email)
    }),
  ),

  // --- registration -------------------------------------------------------------

  Given(
    'a request with following informations {string}, {string}, {string}, {string}, {string}',
    ({ world, params }: Ctx<readonly [string, string, string, string, string]>) => {
      const [email, password, phone, firstname, lastname] = params
      world.registerRequest = { email, password, phone, firstname, lastname }
    },
  ),

  When('the customer wants to register', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const request = world.registerRequest!
      const exit = yield* world.attempt(
        world.testAuth.auth.registerPassword({
          tenantId: TENANT_ID,
          email: request.email,
          password: request.password,
          displayName: request.firstname,
        }),
      )
      if (Exit.isSuccess(exit)) {
        world.signIn(request.email, exit.value.id)
        world.registeredPasswords.set(request.email, request.password)
      }
    }),
  ),

  Then('it should be registered', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
    if (world.actorNamed(world.registerRequest!.email) === undefined) {
      throw new Error("customer should be registered")
    }
  }),

  Then('registration should fail with {string} and message {string}', ({ world, params }: Ctx<readonly [string, string]>) => {
    const [tag, message] = params
    world.expectFailure(tag, message)
  }),

  // --- login --------------------------------------------------------------------

  Given('a login request with {string} and {string}', ({ world, params }: Ctx<readonly [string, string]>) => {
    const [email, password] = params
    world.loginRequest = { email, password }
  }),

  When('the customer wants to login', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const { email, password } = world.loginRequest!
      const exit = yield* world.attempt(world.testAuth.auth.signInPassword(TENANT_ID, email, password))
      if (Exit.isSuccess(exit)) {
        world.sessions.set(email, Redacted.value(exit.value.token))
        world.currentEmail = email
      }
    }),
  ),

  Then('I expect an exception class {string} to be thrown', ({ world, params }: Ctx<readonly [string]>) => {
    const [tag] = params
    world.expectFailure(tag)
  }),

  Then('there should be no errors', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
  }),

  Then('session id should be set', ({ world }: Ctx<readonly []>) => {
    const token = world.sessions.get(world.currentEmail ?? "")
    if (token === undefined) throw new Error("a session token should exist for the logged-in customer")
  }),

  Then('the error should be {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [tag] = params
    world.expectFailure(tag)
  }),

  Given(
    'the customer {string} and {string} is registered in database',
    ({ world, params }: Ctx<readonly [string, string]>) =>
      Effect.gen(function* () {
        const [email, password] = params
        yield* registerCustomer(world, {
          email,
          password,
          phoneNumber: "0601020304",
          firstname: email.split("@")[0]!,
          lastname: "Dosimont",
        })
      }),
  ),

  // --- profile ------------------------------------------------------------------

  Given('a save profile request with {string} and:', ({ world, params, table }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const [email] = params
      const rows = table !== undefined ? yield* table.rows(profileRow) : []
      world.currentEmail = email
      const row = rows[0] ?? {}
      world.profileRequest = row
    }),
  ),

  When('the customer wants to save his profile', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const email = world.currentEmail!
      const customer = world.actorNamed(email)
      if (customer === undefined) return yield* Effect.die(`${email} must be registered`)
      const row = world.profileRequest ?? {}
      const exit = yield* world.dispatch(
        SaveProfile,
        {
          email,
          firstname: row.firstname ?? "Valentin",
          lastname: row.lastname ?? "Dosimont",
          phoneNumber: "0782848227",
          ...(row.language ? { language: row.language } : {}),
          ...(row.line1 ? { line1: row.line1 } : {}),
          ...(row.line3 ? { line3: row.line3 } : {}),
        },
        { actor: customer.id },
      )
      if (Exit.isSuccess(exit)) yield* world.runWorkers()
    }),
  ),

  Then('there should be no errors on SaveProfileResponse', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
  }),

  Then('there should be no errors on UpdateProfileResponse', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
  }),

  Then('there should be no errors RecoverPasswordResponse', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
  }),

  // --- recover password -----------------------------------------------------------

  Given('a recover password request with {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [email] = params
    world.recoverRequestEmail = email
  }),

  When('the customer wants to recover his password', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const before = world.testAuth.emails.length
      const exit = yield* world.attempt(
        world.testAuth.auth.requestPasswordReset(TENANT_ID, world.recoverRequestEmail!),
      )
      if (Exit.isSuccess(exit)) {
        world.lastResetToken = resetEmailSentTo(world, world.recoverRequestEmail!, before)?.token
      }
    }),
  ),

  Then('the password reset request should succeed without revealing account existence', ({ world }: Ctx<readonly []>) => {
    world.expectSuccess()
  }),

  Then('a reset email should have been sent to {string}', ({ world, params }: Ctx<readonly [string]>) => {
    const [email] = params
    if (resetEmailSentTo(world, email, 0) === undefined) {
      throw new Error(`a reset email should have been sent to ${email}`)
    }
  }),

  Then('no reset email should have been sent', ({ world }: Ctx<readonly []>) => {
    const sent = world.testAuth.emails.filter((email) => email.kind === "password-reset").length
    if (sent !== 0) throw new Error(`no reset email should have been sent, got ${sent}`)
  }),

  // --- update password -------------------------------------------------------------

  Given('{string} has requested a password reset', ({ world, params }: Ctx<readonly [string]>) =>
    Effect.gen(function* () {
      const [email] = params
      const before = world.testAuth.emails.length
      yield* world.use(world.testAuth.auth.requestPasswordReset(TENANT_ID, email)).pipe(Effect.orDie)
      const reset = resetEmailSentTo(world, email, before)
      if (reset === undefined) return yield* Effect.die(`a reset email should have been sent to ${email}`)
      world.lastResetToken = reset.token
    }),
  ),

  Given(
    'an UpdatePassword request with {string}, {string}, {string}, NULL',
    ({ world, params }: Ctx<readonly [string, string, string]>) => {
      const [email, currentPassword, newPassword] = params
      world.updatePasswordRequest = {
        email: email === "NULL" ? null : email,
        currentPassword: currentPassword === "NULL" ? null : currentPassword,
        newPassword,
      }
    },
  ),

  Given('the reset is completed with the received token', ({ world }: Ctx<readonly []>) => {
    if (world.lastResetToken === undefined) throw new Error("a reset token should have been received")
    world.updatePasswordRequest = { email: null, currentPassword: null, newPassword: "v@lent1n" }
  }),

  Given('the reset is completed with a wrong token', ({ world }: Ctx<readonly []>) => {
    world.lastResetToken = "aWrongToken"
    world.updatePasswordRequest = { email: null, currentPassword: null, newPassword: "v@lent1n" }
  }),

  When('the customer wants to update his password', ({ world }: Ctx<readonly []>) =>
    Effect.gen(function* () {
      const request = world.updatePasswordRequest!
      if (request.email !== null && request.currentPassword !== null) {
        // Logged-in change with current password.
        const token = world.sessions.get(request.email)
        if (token === undefined) return yield* Effect.die(`${request.email} must be logged in`)
        const exit = yield* world.attempt(
          world.testAuth.auth.changePassword(TENANT_ID, Redacted.make(token), request.currentPassword, request.newPassword),
        )
        if (Exit.isFailure(exit)) return
        const session = yield* world.use(
          world.testAuth.auth.signInPassword(TENANT_ID, request.email, request.newPassword),
        ).pipe(Effect.orDie)
        world.sessions.set(request.email, Redacted.value(session.token))
      } else {
        // Reset-link completion with the received token.
        if (world.lastResetToken === undefined) return yield* Effect.die("a reset token must be available")
        yield* world.attempt(
          world.testAuth.auth.resetPassword(TENANT_ID, Redacted.make(world.lastResetToken), request.newPassword),
        )
      }
    }),
  ),
]
