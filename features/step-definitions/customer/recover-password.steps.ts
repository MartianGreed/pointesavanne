import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { RecoverPasswordRequest } from '../../../ts/domain/customer/recover-password/recover-password-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given('a recover password request with {string}', async function (this: TestWorld, email: string) {
  try {
    this.recoverPasswordRequest = new RecoverPasswordRequest(new Email(email))
  } catch (e) {
    this.requestException = e as Error
  }
})

When('the customer wants to recover his password', async function (this: TestWorld) {
  if (this.requestException) {
    return
  }
  try {
    this.recoverPasswordResponse = await this.recoverPasswordUseCase.execute(this.recoverPasswordRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors RecoverPasswordResponse', async function (this: TestWorld) {
  assert.ok(!this.executeException, 'No exception should have been thrown')
  assert.ok(this.recoverPasswordResponse, 'Recover password response should exist')
})

Then('RecoverPasswordResponse should contain {string}', async function (this: TestWorld, expectedMessage: string) {
  assert.ok(this.recoverPasswordResponse, 'Recover password response should exist')
  assert.strictEqual(this.recoverPasswordResponse.message, expectedMessage)
})
