import { Given, DataTable } from '@cucumber/cucumber'
import type { TestWorld } from '../../support/world.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'
import { SaveProfileRequest } from '../../../ts/domain/customer/save-profile/save-profile-request.ts'
import { strict as assert } from 'node:assert'

Given('a set of customers are already registered:', async function (this: TestWorld, dataTable: DataTable) {
  const customers = dataTable.hashes()
  for (const customer of customers) {
    await this.customerUseCaseManager.register(
      new RegistrationRequest(
        customer.email!,
        customer.password!,
        customer.phoneNumber!,
        customer.firstname!,
        customer.lastname!
      )
    )

    if (customer.line1 !== undefined && customer.line3 !== undefined) {
      const line1 = customer.line1 === 'NULL' ? null : customer.line1
      const line2 = customer.line2 === 'NULL' ? null : customer.line2
      const line3 = customer.line3 === 'NULL' ? null : customer.line3

      await this.customerUseCaseManager.saveProfile(
        new SaveProfileRequest(
          new Email(customer.email!),
          null,
          null,
          null,
          null,
          line1,
          line2,
          line3
        )
      )
    }
  }
})

Given('{string} is logged in', async function (this: TestWorld, identifier: string) {
  const customer = await this.customerRepository.findCustomerByEmail(new Email(identifier))
  assert.notStrictEqual(customer, null, 'Customer should exist')
  this.sessionId = await this.authenticationGateway.logCustomerIn(customer!)
})
