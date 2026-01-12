import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { SaveProfileRequest } from '../../../ts/domain/customer/save-profile/save-profile-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given(
  'a save profile request with {string} and:',
  function (this: TestWorld, email: string, dataTable: DataTable) {
    const data = dataTable.hashes()[0]
    const language = data['language']?.replace(/"/g, '') ?? null
    const firstname = data['firstname'] ?? null
    const lastname = data['lastname'] ?? null
    const line1 = data['line1']?.replace(/"/g, '') ?? null
    const line3 = data['line3']?.replace(/"/g, '') ?? null

    this.saveProfileRequest = new SaveProfileRequest(
      new Email(email),
      firstname,
      lastname,
      null,
      language,
      line1,
      null,
      line3
    )
  }
)

When('the customer wants to save his profile', async function (this: TestWorld) {
  if (this.saveProfileRequest === null) {
    return
  }
  try {
    this.saveProfileResponse = await this.saveProfileUseCase.execute(this.saveProfileRequest)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on SaveProfileResponse', function (this: TestWorld) {
  assert.ok(this.saveProfileResponse, 'Save profile response should exist')
  assert.strictEqual(this.executeException, null, 'No exception should have been thrown')
})
