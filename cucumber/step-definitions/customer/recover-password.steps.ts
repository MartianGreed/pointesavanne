import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { RecoverPasswordRequest } from '../../../ts/domain/customer/recover-password/recover-password-request.ts'

Given('a recover password request with {string}', async function (this: TestWorld, identifier: string) {
  try {
    this.recoverPasswordRequest = new RecoverPasswordRequest(new Email(identifier))
  } catch (e) {
    this.requestException = e as Error
  }
})

When('the customer wants to recover his password', async function (this: TestWorld) {
  try {
    this.recoverPasswordResponse = await this.recoverPasswordUseCase.execute(this.recoverPasswordRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors RecoverPasswordResponse', async function (this: TestWorld) {
  assert.strictEqual(this.requestException, null, 'Request exception should be null')
  assert.strictEqual(this.executeException, null, 'Execute exception should be null')
})

Then('RecoverPasswordResponse should contain {string}', async function (this: TestWorld, message: string) {
  assert.notStrictEqual(this.recoverPasswordResponse, null, 'Recover password response should not be null')
  assert.strictEqual(this.recoverPasswordResponse!.message, message, 'Message should match')
})
