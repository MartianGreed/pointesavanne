import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { UpdatePasswordRequest } from '../../../ts/domain/customer/update-password/update-password-request.ts'

Given(
  'an UpdatePassword request with {string}, {string}, {string}, {string}',
  async function (this: TestWorld, email: string, old: string, newPassword: string, token: string) {
    try {
      const emailArg = email === 'NULL' ? null : new Email(email)
      const oldArg = old === 'NULL' ? null : old
      const tokenArg = token === 'NULL' ? null : token

      this.updatePasswordRequest = new UpdatePasswordRequest(emailArg, oldArg, newPassword, tokenArg)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

When('the customer wants to update his password', async function (this: TestWorld) {
  try {
    this.updatePasswordResponse = await this.updatePasswordUseCase.execute(this.updatePasswordRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on UpdateProfileResponse', async function (this: TestWorld) {
  assert.strictEqual(this.requestException, null, 'Request exception should be null')
  assert.strictEqual(this.executeException, null, 'Execute exception should be null')
  assert.strictEqual(this.updatePasswordResponse!.message, 'Password successfully updated', 'Message should match')
})

Given('{string} has made a RecoverPasswordRequest with token {string}', async function (this: TestWorld, identifier: string, token: string) {
  const customer = await this.customerRepository.findCustomerByEmail(new Email(identifier))
  assert.notStrictEqual(customer, null, 'Customer should exist')
  customer!.recoverPassword(token)
})
