import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { QuotationGenerationRequest } from '../../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import { BookingId } from '../../../ts/domain/booking/booking-id.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'
import { File } from '../../../ts/domain/shared/pdf/file.ts'

Given(
  '{string} has a quotation request by {string} from {string} to {string} for {int} adults and {int} children',
  async function (
    this: TestWorld,
    _villaName: string,
    _email: string,
    from: string,
    to: string,
    adults: number,
    children: number
  ) {
    const response = await this.bookingUseCaseManager.requestQuotation(
      new QuotationRequest(this.villa!, DateUtils.getDate(from), DateUtils.getDate(to), adults, children)
    )
    this.backgroundBooking = response.booking
  }
)

Given('an {string} has been dispatched', async function (this: TestWorld, messageClass: string) {
  const expectedClassName = messageClass.split('\\').pop()!
  const messages = this.messageQueue.getDispatchedMessages()
  const event = messages.find((m) => m.constructor.name === expectedClassName)
  assert.ok(event, `Expected message ${expectedClassName} to be dispatched`)
  this.runningMessage = event!
})

When('the message is handled', async function (this: TestWorld) {
  assert.notStrictEqual(this.runningMessage, null, 'Running message should not be null')
  this.bookingId = this.runningMessage!.bookingId
  const quotationGenerationRequest = new QuotationGenerationRequest(BookingId.fromString(this.runningMessage!.bookingId))

  try {
    this.quotationGenerationResponse = await this.quotationGenerationUseCase.execute(quotationGenerationRequest)
    this.booking = this.quotationGenerationResponse.booking
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'pdf file should have been generated and placed on filesystem with path {string}',
  async function (this: TestWorld, path: string) {
    const realPath = path.replace('<bookingId>', this.bookingId!)
    const file = await this.fileLocator.locate(realPath)
    assert.ok(file, `File should exist at ${realPath}`)
  }
)

Given('quotation has been generated', async function (this: TestWorld) {
  await this.bookingUseCaseManager.generateQuotation(
    new QuotationGenerationRequest(BookingId.fromString(this.backgroundBooking!.getId()))
  )
})
