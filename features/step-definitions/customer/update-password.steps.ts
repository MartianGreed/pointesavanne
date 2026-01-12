import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { UpdatePasswordRequest } from '../../../ts/domain/customer/update-password/update-password-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given(
  '{string} has made a RecoverPasswordRequest with token {string}',
  async function (this: TestWorld, identifier: string, token: string) {
    const customer = await this.customerRepository.findCustomerByEmail(new Email(identifier))
    assert.ok(customer, `Customer ${identifier} not found`)
    customer.recoverPassword(token)
    await this.customerRepository.saveCustomer(customer)
  }
)

Given(
  'an UpdatePassword request with {string}, {string}, {string}, {word}',
  function (this: TestWorld, emailStr: string, oldPassword: string, newPassword: string, token: string) {
    const email = emailStr === 'NULL' ? null : new Email(emailStr)
    const oldPwd = oldPassword === 'NULL' ? null : oldPassword
    const tokenValue = token === 'NULL' ? null : token

    try {
      this.updatePasswordRequest = new UpdatePasswordRequest(email, oldPwd, newPassword, tokenValue)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

When('the customer wants to update his password', async function (this: TestWorld) {
  if (this.updatePasswordRequest === null) {
    return
  }
  try {
    this.updatePasswordResponse = await this.updatePasswordUseCase.execute(this.updatePasswordRequest)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on UpdateProfileResponse', function (this: TestWorld) {
  assert.ok(this.updatePasswordResponse, 'Update password response should exist')
  assert.strictEqual(this.executeException, null, 'No exception should have been thrown')
})
