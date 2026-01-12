import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { QuotationGenerationRequest } from '../../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import { BookingId } from '../../../ts/domain/booking/booking-id.ts'
import { BookingHasBeenRequested } from '../../../ts/domain/booking/message/booking-has-been-requested.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'
import { Email } from '../../../ts/domain/customer/email.ts'
import { Status } from '../../../ts/domain/booking/status.ts'

Given(
  '{string} has a quotation request by {string} from {string} to {string} for {int} adults and {int} children',
  async function (
    this: TestWorld,
    villaName: string,
    customerEmail: string,
    fromDate: string,
    toDate: string,
    adults: number,
    children: number
  ) {
    assert.ok(this.villa, 'Villa must be set')
    const customer = await this.customerRepository.findCustomerByEmail(new Email(customerEmail))
    assert.ok(customer, `Customer ${customerEmail} must exist`)

    await this.authenticationGateway.logCustomerIn(customer)

    const from = DateUtils.getDate(fromDate)
    const to = DateUtils.getDate(toDate)
    const request = new QuotationRequest(this.villa!, from, to, adults, children)
    this.quotationResponse = await this.quotationUseCase.execute(request)
  }
)

Given(
  'an {string} has been dispatched',
  async function (this: TestWorld, messageClass: string) {
    const messages = this.getDispatchedMessages()
    assert.ok(messages.length > 0, 'At least one message should have been dispatched')

    const expectedShortName = messageClass.split('\\').pop()!
    const found = messages.some((m) => m.constructor.name.includes(expectedShortName.replace('Message', '')))
    assert.ok(found, `Expected a message of type "${expectedShortName}" to be dispatched`)
  }
)

Given('quotation has been generated', async function (this: TestWorld) {
  assert.ok(this.quotationResponse, 'Quotation response must exist')
  const bookingId = BookingId.fromString(this.quotationResponse.booking.getId())
  const request = new QuotationGenerationRequest(bookingId)
  this.quotationGenerationResponse = await this.quotationGenerationUseCase.execute(request)
})

When('the message is handled', async function (this: TestWorld) {
  const messages = this.getDispatchedMessages()
  const bookingMessage = messages.find(
    (m): m is BookingHasBeenRequested => m.constructor.name === 'BookingHasBeenRequested'
  )
  assert.ok(bookingMessage, 'BookingHasBeenRequested message should exist')

  const bookingId = BookingId.fromString(bookingMessage.bookingId)
  const request = new QuotationGenerationRequest(bookingId)

  try {
    this.quotationGenerationResponse = await this.quotationGenerationUseCase.execute(request)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'pdf file should have been generated and placed on filesystem with path {string}',
  async function (this: TestWorld, expectedPathPattern: string) {
    assert.ok(this.quotationGenerationResponse, 'Quotation generation response should exist')
    const file = this.quotationGenerationResponse.file
    assert.ok(file, 'File should exist')

    const bookingId = this.quotationGenerationResponse.booking.getId()
    const expectedPath = expectedPathPattern.replace('<bookingId>', bookingId)

    assert.ok(
      file.name.includes('devis.pdf') || file.name.includes(bookingId),
      `File path should contain expected pattern: ${expectedPath}, got: ${file.name}`
    )
  }
)

Then('the booking should in state {string}', async function (this: TestWorld, expectedState: string) {
  let booking = null

  if (this.quotationGenerationResponse) {
    booking = this.quotationGenerationResponse.booking
  } else if (this.quotationSignedResponse) {
    booking = this.quotationSignedResponse.booking
  }

  assert.ok(booking, 'Booking should exist')
  assert.strictEqual(booking.getStatus(), expectedState, `Expected status "${expectedState}" but got "${booking.getStatus()}"`)
})
