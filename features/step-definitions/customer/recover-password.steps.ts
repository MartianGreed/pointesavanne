import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { RecoverPasswordRequest } from '../../../ts/domain/customer/recover-password/recover-password-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given(
  'a recover password request with {string}',
  function (this: TestWorld, email: string) {
    this.recoverPasswordRequest = new RecoverPasswordRequest(new Email(email))
  }
)

When('the customer wants to recover his password', async function (this: TestWorld) {
  if (this.recoverPasswordRequest === null) {
    return
  }
  try {
    this.recoverPasswordResponse = await this.recoverPasswordUseCase.execute(this.recoverPasswordRequest)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors RecoverPasswordResponse', function (this: TestWorld) {
  assert.ok(this.recoverPasswordResponse, 'Recover password response should exist')
  assert.strictEqual(Object.keys(this.recoverPasswordResponse.errors).length, 0)
})

Then('RecoverPasswordResponse should contain {string}', function (this: TestWorld, message: string) {
  assert.ok(this.recoverPasswordResponse, 'Recover password response should exist')
  assert.strictEqual(this.recoverPasswordResponse.message, message)
})
