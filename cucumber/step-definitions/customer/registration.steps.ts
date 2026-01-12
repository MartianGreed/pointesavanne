import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'

Given(
  'a request with following informations {string}, {string}, {string}, {string}, {string}',
  async function (this: TestWorld, email: string, password: string, phoneNumber: string, firstname: string, lastname: string) {
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
  this.registrationResponse = await this.registrationUseCase.execute(this.registrationRequest)
  this.customer = this.registrationResponse.getCustomer()
})

Then('it should be registered', async function (this: TestWorld) {
  assert.notStrictEqual(this.customer, null, 'Customer should not be null')
  const exists = await this.customerRepository.doesCustomerWithEmailExists(this.customer!.getEmail())
  assert.strictEqual(exists, true, 'Customer should exist in repository')
})

Then('RegistrationResponse should contain one error message saying {string}', async function (this: TestWorld, errorMessage: string) {
  assert.notStrictEqual(this.registrationResponse, null, 'Registration response should not be null')
  const errors = this.registrationResponse!.getErrors()
  assert.strictEqual(errors.length, 1, 'Should have exactly one error')
  assert.strictEqual(errors[0], errorMessage, 'Error message should match')
})

Then('I expect an {string} to be thrown', async function (this: TestWorld, errorMessage: string) {
  const exception = this.requestException ?? this.loginRequestException
  assert.notStrictEqual(exception, null, 'An exception should have been thrown')
  assert.strictEqual(exception!.message, errorMessage, 'Exception message should match')
})
