import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { SaveProfileRequest } from '../../../ts/domain/customer/save-profile/save-profile-request.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given(
  'a save profile request with {string} and:',
  async function (this: TestWorld, email: string, dataTable: DataTable) {
    const rows = dataTable.hashes()
    const data = rows[0]!

    const parseValue = (val: string | undefined): string | null => {
      if (!val || val === 'NULL' || val === '""' || val === '"NULL"') return null
      return val.replace(/^"|"$/g, '')
    }

    this.saveProfileRequest = new SaveProfileRequest(
      new Email(email),
      parseValue(data['firstname']),
      parseValue(data['lastname']),
      parseValue(data['phoneNumber']),
      parseValue(data['language']),
      parseValue(data['line1']),
      parseValue(data['line2']),
      parseValue(data['line3'])
    )
  }
)

When('the customer wants to save his profile', async function (this: TestWorld) {
  try {
    this.saveProfileResponse = await this.saveProfileUseCase.execute(this.saveProfileRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on SaveProfileResponse', async function (this: TestWorld) {
  assert.ok(!this.executeException, 'No exception should have been thrown')
  assert.ok(this.saveProfileResponse, 'Save profile response should exist')
  assert.ok(this.saveProfileResponse.getCustomer(), 'Customer should exist in response')
})
