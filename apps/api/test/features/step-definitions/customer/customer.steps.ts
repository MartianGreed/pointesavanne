import { Given, Then, When, type DataTable } from "@cucumber/cucumber"
import { strict as assert } from "node:assert"
import { CommandBus } from "@structure-ai/cqrs"
import { Effect, Redacted } from "effect"
import type { CucumberWorld } from "../../support/world.ts"
import { registerCustomer, signIn } from "../../support/actors.ts"
import { SaveProfile } from "../../../../src/messages/index.ts"
import { TENANT_ID } from "../../../../src/policy.ts"

const isErrorWithTag = (error: unknown, tag: string): boolean =>
  typeof error === "object" && error !== null && "_tag" in error && (error as { _tag: string })._tag === tag

const capture = (world: CucumberWorld) => (error: unknown) => {
  const e = error as { _tag?: string; message?: string; issues?: ReadonlyArray<string>; reason?: string; field?: string }
  world.exception = {
    _tag: e?._tag ?? "Unknown",
    message: e?.message ?? String(error),
    ...(e?.issues !== undefined && { issues: e.issues }),
  }
}

// --- registration -------------------------------------------------------------

Given(
  'a request with following informations {string}, {string}, {string}, {string}, {string}',
  function (this: CucumberWorld, email: string, password: string, phone: string, firstname: string, lastname: string) {
    this.registerRequest = { email, password, phone, firstname, lastname }
  },
)

Given('a set of customers are already registered:', async function (this: CucumberWorld, table: DataTable) {
  for (const row of table.hashes()) {
    await registerCustomer(this, {
      email: row["email"]!,
      password: row["password"]!,
      phoneNumber: row["phoneNumber"],
      firstname: row["firstname"],
      lastname: row["lastname"],
      line1: row["line1"] === "NULL" ? null : row["line1"],
      line2: row["line2"] === "NULL" ? null : row["line2"],
      line3: row["line3"] === "NULL" ? null : row["line3"],
    })
  }
})

When('the customer wants to register', async function (this: CucumberWorld) {
  const w = await this.ensure()
  const request = this.registerRequest!
  const outcome = await w.attempt(
    w.doubles.auth.registerPassword({
      tenantId: TENANT_ID,
      email: request.email,
      password: request.password,
      displayName: request.firstname,
    }),
  )
  if (outcome.ok) {
    this.customers.set(request.email, { userId: outcome.value.id })
    this.registeredPasswords.set(request.email, request.password)
  } else {
    capture(this)(outcome.error)
  }
})

Then('it should be registered', function (this: CucumberWorld) {
  assert.ok(this.exception === undefined, `registration should succeed, got ${this.exception?._tag}`)
  assert.ok(this.customers.has(this.registerRequest!.email), "customer should be registered")
})

Then('registration should fail with {string} and message {string}', function (this: CucumberWorld, tag: string, message: string) {
  assert.ok(this.exception, "registration should have failed")
  assert.equal(this.exception!._tag, tag, `expected ${tag}, got ${this.exception!._tag} (${this.exception!.message})`)
  assert.equal(this.exception!.message, message)
})

// --- login --------------------------------------------------------------------

Given('a login request with {string} and {string}', function (this: CucumberWorld, email: string, password: string) {
  this.loginRequest = { email, password }
})

When('the customer wants to login', async function (this: CucumberWorld) {
  const w = await this.ensure()
  const outcome = await w.attempt(
    w.doubles.auth.signInPassword(TENANT_ID, this.loginRequest!.email, this.loginRequest!.password),
  )
  if (outcome.ok) {
    this.sessions.set(this.loginRequest!.email, Redacted.value(outcome.value.token))
    this.currentEmail = this.loginRequest!.email
  } else {
    capture(this)(outcome.error)
  }
})

Then('I expect an exception class {string} to be thrown', function (this: CucumberWorld, tag: string) {
  assert.ok(this.exception, "an exception should have been thrown")
  assert.equal(this.exception!._tag, tag, `expected ${tag}, got ${this.exception!._tag} (${this.exception!.message})`)
})

Then('there should be no errors', function (this: CucumberWorld) {
  assert.equal(this.exception, undefined)
})

Then('session id should be set', function (this: CucumberWorld) {
  const token = this.sessions.get(this.currentEmail ?? "")
  assert.ok(token, "a session token should exist for the logged-in customer")
})

Then('the error should be {string}', function (this: CucumberWorld, tag: string) {
  assert.ok(this.exception, "an error should have been captured")
  assert.equal(this.exception!._tag, tag)
})

Given(
  'the customer {string} and {string} is registered in database',
  async function (this: CucumberWorld, email: string, password: string) {
    await registerCustomer(this, {
      email,
      password,
      phoneNumber: '0601020304',
      firstname: email.split('@')[0]!,
      lastname: 'Dosimont',
    })
  },
)

Given('{string} is logged in', async function (this: CucumberWorld, email: string) {
  if (!this.customers.has(email)) {
    await registerCustomer(this, {
      email,
      password: "v@lent1n",
      phoneNumber: "0601020304",
      firstname: email.split("@")[0]!,
      lastname: "Dosimont",
    })
  }
  await signIn(this, email)
})

// --- profile ------------------------------------------------------------------

Given('a save profile request with {string} and:', function (this: CucumberWorld, email: string, table: DataTable) {
  const row = table.hashes()[0] ?? {}
  this.currentEmail = email
  this.profileRequest = {
    language: row["language"],
    firstname: row["firstname"],
    lastname: row["lastname"],
    line1: row["line1"],
    line3: row["line3"],
  }
})

When('the customer wants to save his profile', async function (this: CucumberWorld) {
  const w = await this.ensure()
  const email = this.currentEmail!
  const customer = this.customers.get(email)
  assert.ok(customer, `${email} must be registered`)
  const row = this.profileRequest ?? {}
  const outcome = await w.attempt(
    Effect.gen(function* () {
      const bus = yield* CommandBus
      yield* bus.dispatch(
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
        { actor: customer.userId },
      )
    }) as never,
  )
  if (!outcome.ok) capture(this)(outcome.error)
  else await w.runWorkers()
})

Then('there should be no errors on SaveProfileResponse', function (this: CucumberWorld) {
  assert.equal(this.exception, undefined)
})

Then('there should be no errors on UpdateProfileResponse', function (this: CucumberWorld) {
  assert.equal(this.exception, undefined)
})

Then('there should be no errors RecoverPasswordResponse', function (this: CucumberWorld) {
  assert.equal(this.exception, undefined)
})

// --- recover password -----------------------------------------------------------

Given('a recover password request with {string}', function (this: CucumberWorld, email: string) {
  this.recoverRequestEmail = email
})

When('the customer wants to recover his password', async function (this: CucumberWorld) {
  const w = await this.ensure()
  const before = w.doubles.authEmails.length
  const outcome = await w.attempt(w.doubles.auth.requestPasswordReset(TENANT_ID, this.recoverRequestEmail!))
  if (!outcome.ok) {
    capture(this)(outcome.error)
  } else {
    const reset = w.doubles.authEmails
      .slice(before)
      .find((email) => email.kind === "password-reset" && email.to === this.recoverRequestEmail)
    this.lastResetToken = reset?.token
  }
})

Then('the password reset request should succeed without revealing account existence', function (this: CucumberWorld) {
  assert.equal(this.exception, undefined)
})

Then('a reset email should have been sent to {string}', function (this: CucumberWorld, email: string) {
  const w = this.world!
  assert.ok(
    w.doubles.authEmails.some((sent) => sent.kind === "password-reset" && sent.to === email),
    `a reset email should have been sent to ${email}`,
  )
})

Then('no reset email should have been sent', function (this: CucumberWorld) {
  const w = this.world!
  assert.equal(
    w.doubles.authEmails.filter((sent) => sent.kind === "password-reset").length,
    0,
    "no reset email should have been sent",
  )
})

// --- update password -------------------------------------------------------------

Given('{string} has requested a password reset', async function (this: CucumberWorld, email: string) {
  const w = await this.ensure()
  const before = w.doubles.authEmails.length
  await w.run(w.doubles.auth.requestPasswordReset(TENANT_ID, email))
  const reset = w.doubles.authEmails.slice(before).find((sent) => sent.kind === "password-reset" && sent.to === email)
  assert.ok(reset, `a reset email should have been sent to ${email}`)
  this.lastResetToken = reset.token
})

Given(
  'an UpdatePassword request with {string}, {string}, {string}, NULL',
  function (this: CucumberWorld, email: string | "NULL", currentPassword: string | "NULL", newPassword: string) {
    this.updatePasswordRequest = {
      email: email === "NULL" ? null : email,
      currentPassword: currentPassword === "NULL" ? null : currentPassword,
      newPassword,
    }
  },
)

Given('the reset is completed with the received token', function (this: CucumberWorld) {
  assert.ok(this.lastResetToken, "a reset token should have been received")
  this.updatePasswordRequest = { email: null, currentPassword: null, newPassword: "v@lent1n" }
})

Given('the reset is completed with a wrong token', function (this: CucumberWorld) {
  this.lastResetToken = "aWrongToken"
  this.updatePasswordRequest = { email: null, currentPassword: null, newPassword: "v@lent1n" }
})

When('the customer wants to update his password', async function (this: CucumberWorld) {
  const w = await this.ensure()
  const request = this.updatePasswordRequest!
  if (request.email !== null && request.currentPassword !== null) {
    // Logged-in change with current password.
    const token = this.sessions.get(request.email)
    assert.ok(token, `${request.email} must be logged in`)
    const outcome = await w.attempt(
      w.doubles.auth.changePassword(TENANT_ID, Redacted.make(token), request.currentPassword, request.newPassword),
    )
    if (!outcome.ok) {
      capture(this)(outcome.error)
      return
    }
    const session = await w.run(w.doubles.auth.signInPassword(TENANT_ID, request.email, request.newPassword))
    this.sessions.set(request.email, Redacted.value(session.token))
  } else {
    // Reset-link completion with the received token.
    assert.ok(this.lastResetToken, "a reset token must be available")
    const outcome = await w.attempt(
      w.doubles.auth.resetPassword(TENANT_ID, Redacted.make(this.lastResetToken), request.newPassword),
    )
    if (!outcome.ok) capture(this)(outcome.error)
  }
})
