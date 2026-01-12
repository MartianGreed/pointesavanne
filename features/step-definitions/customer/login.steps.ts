import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { LoginRequest } from '../../../ts/domain/customer/login/login-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'

Given(
  'a login request with {string} and {string}',
  function (this: TestWorld, email: string, password: string) {
    try {
      this.loginRequest = new LoginRequest(new Email(email), password)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

Given(
  'the customer {string} and {string} is registered in database',
  async function (this: TestWorld, email: string, password: string) {
    await this.customerUseCaseManager.register(
      new RegistrationRequest(email, password, '0601020304', 'Test', 'User')
    )
  }
)

When('the customer wants to login', async function (this: TestWorld) {
  if (this.loginRequest === null) {
    return
  }
  try {
    this.loginResponse = await this.loginUseCase.execute(this.loginRequest)
    if (this.loginResponse.sessionId) {
      this.sessionId = this.loginResponse.sessionId
    }
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors', function (this: TestWorld) {
  assert.ok(this.loginResponse, 'Login response should exist')
  assert.strictEqual(this.loginResponse.getErrors().length, 0)
})

Then('session id should be set', function (this: TestWorld) {
  assert.ok(this.sessionId, 'Session ID should be set')
})

Then('the response should contain the message {string}', function (this: TestWorld, message: string) {
  assert.ok(this.loginResponse, 'Login response should exist')
  const errors = this.loginResponse.getErrors()
  assert.ok(errors.includes(message), `Expected error "${message}" in ${JSON.stringify(errors)}`)
})
