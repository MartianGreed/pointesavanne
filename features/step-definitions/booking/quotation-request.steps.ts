import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { Villa } from '../../../ts/domain/booking/villa.ts'
import { Discount } from '../../../ts/domain/booking/discount/discount.ts'
import { Range as DiscountRange } from '../../../ts/domain/booking/discount/range.ts'
import { DiscountAmount } from '../../../ts/domain/booking/discount/discount-amount.ts'
import { PriceRange } from '../../../ts/domain/booking/pricing/price-range.ts'
import { Range as PricingRange } from '../../../ts/domain/booking/pricing/range.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'
import { Status } from '../../../ts/domain/booking/status.ts'
import { BookingHasBeenRequested } from '../../../ts/domain/booking/message/booking-has-been-requested.ts'

Given(
  'a villa {string} with a caution amount of {string} and the mandatory household of {string}',
  function (this: TestWorld, name: string, amount: string, householdAmount: string) {
    this.villa = new Villa(name, this.priceParser.parse(amount), this.priceParser.parse(householdAmount))
  }
)

Given('a discount over time set as :', function (this: TestWorld, dataTable: DataTable) {
  this.discount = new Discount()
  for (const row of dataTable.hashes()) {
    this.discount.addRange(
      new DiscountRange(parseInt(row['from'], 10), parseInt(row['to'], 10), DiscountAmount.parse(row['discountAmount']))
    )
  }
})

Given('the following pricing range :', function (this: TestWorld, dataTable: DataTable) {
  this.priceRange = new PriceRange()
  for (const row of dataTable.hashes()) {
    this.priceRange.addRange(
      new PricingRange(DateUtils.getDate(row['from']), DateUtils.getDate(row['to']), this.priceParser.parse(row['baseAmount']))
    )
  }
  this.villa.setPriceRange(this.priceRange).setDiscount(this.discount)
})

Given(
  'a QuotationRequest to villa named {string} from {string} to {string} for {int} adults and {int} children',
  function (this: TestWorld, _villaName: string, from: string, to: string, adults: number, children: number) {
    this.quotationRequest = new QuotationRequest(
      this.villa,
      DateUtils.getDate(from),
      DateUtils.getDate(to),
      adults,
      children
    )
  }
)

Given('villa named {string} is booked :', async function (this: TestWorld, _villaName: string, dataTable: DataTable) {
  for (const row of dataTable.hashes()) {
    await this.quotationUseCase.execute(
      new QuotationRequest(
        this.villa,
        DateUtils.getDate(row['from']),
        DateUtils.getDate(row['to']),
        parseInt(row['adults'], 10),
        parseInt(row['children'], 10)
      )
    )
  }
})

When('the customer submits the QuotationRequest', async function (this: TestWorld) {
  if (this.quotationRequest === null) {
    return
  }
  try {
    this.quotationResponse = await this.quotationUseCase.execute(this.quotationRequest)
    this.booking = this.quotationResponse.booking
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'an exception {string} should be thrown with message {string}',
  function (this: TestWorld, exceptionClass: string, message: string) {
    assert.ok(this.executeException, 'No exception has been thrown during execution.')
    const expectedClassName = exceptionClass.split('\\').pop()!.replace('Exception', '')
    const actualClassName = this.executeException.name || this.executeException.constructor.name
    assert.ok(
      actualClassName.includes(expectedClassName) || actualClassName === expectedClassName,
      `Expected exception ${expectedClassName} but got ${actualClassName}`
    )
    assert.strictEqual(this.executeException.message, message)
  }
)

Then(
  'it should be accepted with a total amount of {string}, a tourist tax of {string} unranked and {string} with a 4 star rating ranking and a deposit amount of {string}',
  function (
    this: TestWorld,
    totalAmount: string,
    unrankedTax: string,
    rankedTax: string,
    depositAmount: string
  ) {
    assert.ok(this.booking, 'Booking should exist')
    const pricingContext = this.booking.getPricingContext()

    const actualTotal = pricingContext.getTotalAmount().format()
    const expectedTotal = totalAmount.replace('.', ',').replace(/\s/g, ' ')
    assert.strictEqual(actualTotal, expectedTotal, `Total amount mismatch: expected ${expectedTotal}, got ${actualTotal}`)

    const actualUnrankedTax = this.booking.getUnrankedTouristTax().format()
    const expectedUnrankedTax = unrankedTax.replace('.', ',').replace(/\s/g, ' ')
    assert.strictEqual(actualUnrankedTax, expectedUnrankedTax, `Unranked tax mismatch: expected ${expectedUnrankedTax}, got ${actualUnrankedTax}`)

    const actualRankedTax = this.booking.getRankedTouristTax().format()
    const expectedRankedTax = rankedTax.replace('.', ',').replace(/\s/g, ' ')
    assert.strictEqual(actualRankedTax, expectedRankedTax, `Ranked tax mismatch: expected ${expectedRankedTax}, got ${actualRankedTax}`)

    const actualDeposit = this.booking.getVilla().getDepositAmount().format()
    const expectedDeposit = depositAmount.replace('.', ',').replace(/\s/g, ' ')
    assert.strictEqual(actualDeposit, expectedDeposit, `Deposit mismatch: expected ${expectedDeposit}, got ${actualDeposit}`)
  }
)

Then('{int} emails should have been sent', function (this: TestWorld, emailCount: number) {
  assert.strictEqual(this.mailer.getSent().length, emailCount)
})

Then(
  'an {string} event at index {int} has been dispatched',
  function (this: TestWorld, messageClass: string, index: number) {
    const messages = this.asyncMessage.getDispatchedMessages()
    assert.ok(messages[index], `No message at index ${index}`)
    const expectedClassName = messageClass.split('\\').pop()!
    const actualClassName = messages[index]!.constructor.name
    assert.strictEqual(actualClassName, expectedClassName, `Expected message ${expectedClassName} but got ${actualClassName}`)
  }
)

Then('the booking should in state {string}', function (this: TestWorld, state: string) {
  const bookingToCheck = this.booking ?? this.backgroundBooking
  assert.ok(bookingToCheck, 'Booking should exist')
  assert.strictEqual(bookingToCheck.getStatus(), Status[state.toUpperCase().replace(/-/g, '_') as keyof typeof Status] ?? state)
})
