import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { LoginRequest } from '../../../ts/domain/customer/login/login-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { Customer } from '../../../ts/domain/customer/customer.ts'
import { CustomerId } from '../../../ts/domain/customer/customer-id.ts'

Given(
  'a login request with {string} and {string}',
  async function (this: TestWorld, email: string, password: string) {
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
    const encodedPassword = await this.encoder.encode(password)
    const customer = Customer.register(
      CustomerId.build(),
      new Email(email),
      encodedPassword,
      '0601020304',
      'Test',
      'User'
    )
    await this.customerRepository.saveCustomer(customer)
  }
)

Given('{string} is logged in', async function (this: TestWorld, email: string) {
  const customer = await this.customerRepository.findCustomerByEmail(new Email(email))
  assert.ok(customer, `Customer with email ${email} should exist`)
  await this.authenticationGateway.logCustomerIn(customer)
})

When('the customer wants to login', async function (this: TestWorld) {
  if (this.requestException) {
    return
  }
  try {
    this.loginResponse = await this.loginUseCase.execute(this.loginRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors', async function (this: TestWorld) {
  assert.ok(!this.requestException, 'No request exception should have occurred')
  assert.ok(!this.executeException, 'No execute exception should have occurred')
  if (this.loginResponse) {
    assert.strictEqual(this.loginResponse.errors.length, 0, 'There should be no errors in response')
  }
})

Then('session id should be set', async function (this: TestWorld) {
  assert.ok(this.loginResponse, 'Login response should exist')
  assert.ok(this.loginResponse.sessionId, 'Session ID should be set')
})

Then('the response should contain the message {string}', async function (this: TestWorld, expectedMessage: string) {
  assert.ok(this.loginResponse, 'Login response should exist')
  assert.ok(
    this.loginResponse.errors.includes(expectedMessage),
    `Expected error "${expectedMessage}" but got: ${this.loginResponse.errors.join(', ')}`
  )
})
