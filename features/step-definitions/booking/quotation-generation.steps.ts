import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { QuotationGenerationRequest } from '../../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'

Given(
  '{string} has a quotation request by {string} from {string} to {string} for {int} adults and {int} children',
  async function (
    this: TestWorld,
    _villaName: string,
    _customerEmail: string,
    from: string,
    to: string,
    adults: number,
    children: number
  ) {
    const request = new QuotationRequest(
      this.villa,
      DateUtils.getDate(from),
      DateUtils.getDate(to),
      adults,
      children
    )
    const response = await this.quotationUseCase.execute(request)
    this.booking = response.booking
    this.mailer.clearSent()
  }
)

Given(
  'an {string} has been dispatched',
  function (this: TestWorld, messageClass: string) {
    assert.ok(this.booking, 'Booking should exist')
    const messages = this.asyncMessage.getDispatchedMessages()
    const expectedClassName = messageClass.split('\\').pop()!
    const found = messages.some((msg) => msg.constructor.name === expectedClassName)
    assert.ok(found, `Expected message ${expectedClassName} to be dispatched`)
  }
)

When('the message is handled', async function (this: TestWorld) {
  assert.ok(this.booking, 'Booking should exist')
  const bookingId = this.booking.getId()
  const request = new QuotationGenerationRequest(bookingId)
  try {
    this.quotationGenerationResponse = await this.quotationGenerationUseCase.execute(request)
    this.booking = this.quotationGenerationResponse.booking
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'pdf file should have been generated and placed on filesystem with path {string}',
  function (this: TestWorld, pathPattern: string) {
    assert.ok(this.quotationGenerationResponse, 'QuotationGenerationResponse should exist')
    const generatedPath = this.quotationGenerationResponse.file.name
    const bookingId = this.booking!.getId().toString()
    const expectedPath = pathPattern.replace('<bookingId>', bookingId)
    assert.strictEqual(generatedPath, expectedPath, `Expected PDF at ${expectedPath} but got ${generatedPath}`)
  }
)
