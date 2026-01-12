import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'

Given(
  'a QuotationRequest to villa named {string} from {string} to {string} for {int} adults and {int} children',
  async function (this: TestWorld, _name: string, from: string, to: string, adultsCount: number, childrenCount: number) {
    try {
      this.quotationRequest = new QuotationRequest(
        this.villa!,
        DateUtils.getDate(from),
        DateUtils.getDate(to),
        adultsCount,
        childrenCount
      )
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

When('the customer submits the QuotationRequest', async function (this: TestWorld) {
  try {
    this.quotationResponse = await this.quotationUseCase.execute(this.quotationRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'an exception {string} should be thrown with message {string}',
  async function (this: TestWorld, exceptionClass: string, message: string) {
    assert.notStrictEqual(this.executeException, null, 'An exception should have been thrown')
    const expectedClassName = exceptionClass.split('\\').pop()!
    const actualClassName = this.executeException!.constructor.name
    assert.strictEqual(actualClassName, expectedClassName, `Exception class should match: expected ${expectedClassName}`)
    assert.strictEqual(this.executeException!.message, message, 'Exception message should match')
  }
)

Then(
  'it should be accepted with a total amount of {string}, a tourist tax of {string} unranked and {string} with a 4 star rating ranking and a deposit amount of {string}',
  async function (
    this: TestWorld,
    totalAmount: string,
    unrankedTouristTax: string,
    rankedTouristTax: string,
    depositAmount: string
  ) {
    assert.notStrictEqual(this.quotationResponse, null, 'Quotation response should not be null')
    const booking = this.quotationResponse!.booking
    const pricingContext = booking.getPricingContext()

    assert.strictEqual(pricingContext.getTotalAmount().toString(), totalAmount, 'Total amount should match')
    assert.strictEqual(booking.getUnrankedTouristTax().toString(), unrankedTouristTax, 'Unranked tourist tax should match')
    assert.strictEqual(booking.getRankedTouristTax().toString(), rankedTouristTax, 'Ranked tourist tax should match')
    assert.strictEqual(booking.getVilla().getDepositAmount().toString(), depositAmount, 'Deposit amount should match')
  }
)
