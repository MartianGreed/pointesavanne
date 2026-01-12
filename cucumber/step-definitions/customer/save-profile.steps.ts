import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { SaveProfileRequest } from '../../../ts/domain/customer/save-profile/save-profile-request.ts'

Given('a save profile request with {string} and:', async function (this: TestWorld, identifier: string, dataTable: DataTable) {
  const values = dataTable.hashes()[0]!
  this.valuesToUpdate = values
  try {
    this.saveProfileRequest = new SaveProfileRequest(
      new Email(identifier),
      values.firstname ?? null,
      values.lastname ?? null,
      values.phoneNumber ?? null,
      values.language ?? null,
      values.line1 ?? null,
      values.line2 ?? null,
      values.line3 ?? null
    )
  } catch (e) {
    this.requestException = e as Error
  }
})

When('the customer wants to save his profile', async function (this: TestWorld) {
  try {
    this.saveProfileResponse = await this.saveProfileUseCase.execute(this.saveProfileRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('there should be no errors on SaveProfileResponse', async function (this: TestWorld) {
  assert.strictEqual(this.executeException, null, 'Execute exception should be null')
  assert.strictEqual(this.requestException, null, 'Request exception should be null')

  const customer = this.saveProfileResponse!.getCustomer()
  assert.notStrictEqual(customer, null, 'Customer should not be null')
  if (!customer) return

  for (const [key, value] of Object.entries(this.valuesToUpdate)) {
    if (key === 'line1' || key === 'line2' || key === 'line3') {
      const address = customer.getAddress()
      if (address) {
        const addressGetters: Record<string, () => string | null> = {
          line1: () => address.getLine1(),
          line2: () => address.getLine2(),
          line3: () => address.getLine3()
        }
        const actualValue = addressGetters[key]?.()
        assert.strictEqual(actualValue, value, `Address ${key} should match`)
      }
      continue
    }

    const profile = customer.getProfile()
    const profileGetters: Record<string, () => string | null> = {
      firstname: () => profile.getFirstname(),
      lastname: () => profile.getLastname(),
      phoneNumber: () => profile.getPhoneNumber(),
      language: () => profile.getLanguage()
    }
    const actualValue = profileGetters[key]?.()
    if (actualValue !== undefined) {
      assert.strictEqual(actualValue, value, `Profile ${key} should match`)
    }
  }
})
