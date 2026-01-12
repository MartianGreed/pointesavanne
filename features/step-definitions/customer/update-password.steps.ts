import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { UpdatePasswordRequest } from '../../../ts/domain/customer/update-password/update-password-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

const parseNullableString = (value: string): string | null => {
  if (value === 'NULL' || value === 'null' || !value) return null
  return value
}

Given(
  'an UpdatePassword request with {string}, {string}, {string}, {word}',
  async function (this: TestWorld, email: string, oldPassword: string, newPassword: string, token: string) {
    try {
      const emailValue = parseNullableString(email)
      const oldPwValue = parseNullableString(oldPassword)
      const newPwValue = parseNullableString(newPassword)
      const tokenValue = parseNullableString(token)

      this.updatePasswordRequest = new UpdatePasswordRequest(
        emailValue ? new Email(emailValue) : null,
        oldPwValue,
        newPwValue,
        tokenValue
      )
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

Given(
  'an UpdatePassword request with NULL, NULL, {string}, {string}',
  async function (this: TestWorld, newPassword: string, token: string) {
    try {
      this.updatePasswordRequest = new UpdatePasswordRequest(
        null,
        null,
        newPassword,
        token
      )
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

Given(
  '{string} has made a RecoverPasswordRequest with token {string}',
  async function (this: TestWorld, email: string, token: string) {
    const customer = await this.customerRepository.findCustomerByEmail(new Email(email))
    assert.ok(customer, `Customer with email ${email} should exist`)
    customer.recoverPassword(token)
    await this.customerRepository.saveCustomer(customer)
  }
)

When('the customer wants to update his password', async function (this: TestWorld) {
  if (this.requestException) {
    return
  }
  try {
    this.updatePasswordResponse = await this.updatePasswordUseCase.execute(this.updatePasswordRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on UpdateProfileResponse', async function (this: TestWorld) {
  assert.ok(!this.executeException, 'No exception should have been thrown')
  assert.ok(!this.requestException, 'No request exception should have occurred')
  assert.ok(this.updatePasswordResponse, 'Update password response should exist')
})
