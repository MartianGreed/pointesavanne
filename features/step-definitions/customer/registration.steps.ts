import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'

Given(
  'a request with following informations {string}, {string}, {string}, {string}, {string}',
  async function (
    this: TestWorld,
    email: string,
    password: string,
    phoneNumber: string,
    firstname: string,
    lastname: string
  ) {
    try {
      this.registrationRequest = new RegistrationRequest(email, password, phoneNumber, firstname, lastname)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

When('the customer wants to register', async function (this: TestWorld) {
  if (this.registrationRequest === null) {
    return
  }
  try {
    this.registrationResponse = await this.registrationUseCase.execute(this.registrationRequest)
    this.customer = this.registrationResponse.getCustomer()
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('it should be registered', async function (this: TestWorld) {
  assert.ok(this.customer, 'Customer should exist')
  const exists = await this.customerRepository.doesCustomerWithEmailExists(this.customer.getEmail())
  assert.strictEqual(exists, true)
})

Then(
  'RegistrationResponse should contain one error message saying {string}',
  function (this: TestWorld, errorMessage: string) {
    assert.ok(this.registrationResponse, 'Registration response should exist')
    const errors = this.registrationResponse.getErrors()
    assert.strictEqual(errors.length, 1)
    assert.strictEqual(errors[0], errorMessage)
  }
)

Then('I expect an {string} to be thrown', function (this: TestWorld, errorMessage: string) {
  assert.ok(this.requestException, 'An exception should have been thrown')
  assert.strictEqual(this.requestException.message, errorMessage)
})
