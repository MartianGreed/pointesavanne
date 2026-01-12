import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { LoginRequest } from '../../../ts/domain/customer/login/login-request.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'

Given('a login request with {string} and {string}', async function (this: TestWorld, email: string, password: string) {
  try {
    this.loginRequest = new LoginRequest(new Email(email), password)
  } catch (e) {
    this.loginRequestException = e as Error
  }
})

When('the customer wants to login', async function (this: TestWorld) {
  if (this.loginRequest === null) {
    return
  }

  try {
    this.loginResponse = await this.loginUseCase.execute(this.loginRequest)
  } catch (e) {
    this.executeException = e as Error
  }
})

Given('the customer {string} and {string} is registered in database', async function (this: TestWorld, email: string, password: string) {
  await this.registrationUseCase.execute(new RegistrationRequest(email, password, '+33606060606', 'Jean', 'Test'))
})

Then('there should be no errors', async function (this: TestWorld) {
  assert.strictEqual(this.loginRequestException, null, 'Login request exception should be null')
  assert.strictEqual(this.executeException, null, 'Execute exception should be null')
})

Then('session id should be set', async function (this: TestWorld) {
  assert.notStrictEqual(this.loginResponse, null, 'Login response should not be null')
  const isLoggedIn = await this.authenticationGateway.isCustomerLoggedIn(this.loginResponse!.sessionId!)
  assert.strictEqual(isLoggedIn, true, 'Customer should be logged in')
})

Then('the response should contain the message {string}', async function (this: TestWorld, errorMessage: string) {
  assert.notStrictEqual(this.loginResponse, null, 'Login response should not be null')
  assert.strictEqual(this.loginResponse!.errors[0], errorMessage, 'Error message should match')
})

Then('I expect an exception class {string} to be thrown', async function (this: TestWorld, exceptionClass: string) {
  assert.notStrictEqual(this.executeException, null, 'An exception should have been thrown during execution')
  const actualClassName = this.executeException!.constructor.name
  const expectedClassName = exceptionClass.split('\\').pop()!
  assert.strictEqual(actualClassName, expectedClassName, `Exception class should match: expected ${expectedClassName}, got ${actualClassName}`)
})
