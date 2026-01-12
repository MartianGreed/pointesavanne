import { Given, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from './world.ts'
import { RegistrationRequest } from '../../ts/domain/customer/register/registration-request.ts'
import { SaveProfileRequest } from '../../ts/domain/customer/save-profile/save-profile-request.ts'
import { Email } from '../../ts/domain/customer/email.ts'

Given('a set of customers are already registered:', async function (this: TestWorld, dataTable: DataTable) {
  const rows = dataTable.hashes()
  for (const customer of rows) {
    await this.customerUseCaseManager.register(
      new RegistrationRequest(
        customer['email'],
        customer['password'],
        customer['phoneNumber'],
        customer['firstname'],
        customer['lastname']
      )
    )

    if (customer['line1'] !== undefined && customer['line3'] !== undefined) {
      const line1 = customer['line1'] === 'NULL' ? null : customer['line1']
      const line2 = customer['line2'] === 'NULL' ? null : customer['line2']
      const line3 = customer['line3'] === 'NULL' ? null : customer['line3']

      await this.customerUseCaseManager.saveProfile(
        new SaveProfileRequest(new Email(customer['email']), undefined, undefined, undefined, undefined, line1, line2, line3)
      )
    }
  }
})

Then(
  'I expect an exception class {string} to be thrown',
  function (this: TestWorld, exceptionClass: string) {
    assert.ok(this.executeException, 'No exception has been thrown during execution.')
    const expectedClassName = exceptionClass.split('\\').pop()!.replace('Exception', '')
    const actualClassName = this.executeException.name || this.executeException.constructor.name
    assert.ok(
      actualClassName.includes(expectedClassName) || actualClassName === expectedClassName,
      `Expected exception ${expectedClassName} but got ${actualClassName}`
    )
  }
)

Given('{string} is logged in', async function (this: TestWorld, identifier: string) {
  const customer = await this.customerRepository.findCustomerByEmail(new Email(identifier))
  assert.ok(customer, `Customer ${identifier} not found`)
  this.sessionId = await this.authenticationGateway.logCustomerIn(customer)
})
