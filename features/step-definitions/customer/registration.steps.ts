import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { RegistrationRequest } from '../../../ts/domain/customer/register/registration-request.ts'
import { Customer } from '../../../ts/domain/customer/customer.ts'
import { CustomerId } from '../../../ts/domain/customer/customer-id.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

Given(
  'a request with following informations {string}, {string}, {string}, {string}, {string}',
  async function (this: TestWorld, email: string, password: string, phone: string, firstname: string, lastname: string) {
    try {
      this.registrationRequest = new RegistrationRequest(email, password, phone, firstname, lastname)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

Given('a set of customers are already registered:', async function (this: TestWorld, dataTable: DataTable) {
  const rows = dataTable.hashes()
  for (const row of rows) {
    const encodedPassword = await this.encoder.encode(row['password']!)
    const customer = Customer.register(
      CustomerId.build(),
      new Email(row['email']!),
      encodedPassword,
      row['phoneNumber']!,
      row['firstname']!,
      row['lastname']!
    )

    if (row['line1'] && row['line1'] !== 'NULL') {
      const { Address } = await import('../../../ts/domain/customer/address.ts')
      const address = new Address(
        row['line1'],
        row['line3'] !== 'NULL' ? row['line3']! : '',
        row['line2'] !== 'NULL' ? row['line2'] : undefined
      )
      customer.updateProfile(address)
    }

    await this.customerRepository.saveCustomer(customer)
  }
})

When('the customer wants to register', async function (this: TestWorld) {
  if (this.requestException) {
    return
  }
  try {
    this.registrationResponse = await this.registrationUseCase.execute(this.registrationRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then('it should be registered', async function (this: TestWorld) {
  assert.ok(this.registrationResponse, 'Registration response should exist')
  assert.ok(this.registrationResponse.getCustomer(), 'Customer should exist in response')
  assert.strictEqual(this.registrationResponse.getErrors().length, 0, 'There should be no errors')
})

Then(
  'RegistrationResponse should contain one error message saying {string}',
  async function (this: TestWorld, expectedMessage: string) {
    assert.ok(this.registrationResponse, 'Registration response should exist')
    const errors = this.registrationResponse.getErrors()
    assert.ok(errors.length > 0, 'There should be errors')
    assert.ok(
      errors.includes(expectedMessage),
      `Expected error "${expectedMessage}" but got: ${errors.join(', ')}`
    )
  }
)

Then('I expect an {string} to be thrown', async function (this: TestWorld, expectedMessage: string) {
  const exception = this.requestException || this.executeException
  assert.ok(exception, 'An exception should have been thrown')
  assert.strictEqual(exception.message, expectedMessage)
})

Then(
  'I expect an exception class {string} to be thrown',
  async function (this: TestWorld, expectedClassName: string) {
    const exception = this.requestException || this.executeException
    assert.ok(exception, 'An exception should have been thrown')
    const actualClassName = exception.constructor.name
    const expectedShortName = expectedClassName.split('\\').pop()!.replace('Exception', '')
    assert.ok(
      actualClassName.includes(expectedShortName) || expectedShortName.includes(actualClassName.replace('Exception', '')),
      `Expected exception class to contain "${expectedShortName}" but got "${actualClassName}"`
    )
  }
)
