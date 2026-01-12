import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'

const normalizeWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim()
import { Villa } from '../../../ts/domain/booking/villa.ts'
import { Price } from '../../../ts/domain/booking/pricing/price.ts'
import { PriceParser } from '../../../ts/domain/booking/pricing/price-parser.ts'
import { PriceRange } from '../../../ts/domain/booking/pricing/price-range.ts'
import { Range as PricingRange } from '../../../ts/domain/booking/pricing/range.ts'
import { Discount } from '../../../ts/domain/booking/discount/discount.ts'
import { Range as DiscountRange } from '../../../ts/domain/booking/discount/range.ts'
import { DiscountAmount } from '../../../ts/domain/booking/discount/discount-amount.ts'
import { QuotationRequest } from '../../../ts/domain/booking/quotation/quotation-request.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

const priceParser = new PriceParser()

Given(
  'a villa {string} with a caution amount of {string} and the mandatory household of {string}',
  async function (this: TestWorld, name: string, cautionAmount: string, householdAmount: string) {
    const caution = priceParser.parse(cautionAmount)
    const household = priceParser.parse(householdAmount)
    this.villa = new Villa(name, caution, household)
  }
)

Given('a discount over time set as :', async function (this: TestWorld, dataTable: DataTable) {
  assert.ok(this.villa, 'Villa must be set before discount')
  const discount = new Discount()

  for (const row of dataTable.hashes()) {
    const from = parseInt(row['from']!, 10)
    const to = parseInt(row['to']!, 10)
    const amount = DiscountAmount.parse(row['discountAmount']!)
    discount.addRange(new DiscountRange(from, to, amount))
  }

  this.villa.setDiscount(discount)
})

Given('the following pricing range :', async function (this: TestWorld, dataTable: DataTable) {
  assert.ok(this.villa, 'Villa must be set before pricing range')
  const priceRange = new PriceRange()

  for (const row of dataTable.hashes()) {
    const from = DateUtils.getDate(row['from']!)
    const to = DateUtils.getDate(row['to']!)
    const price = priceParser.parse(row['baseAmount']!)
    priceRange.addRange(new PricingRange(from, to, price))
  }

  this.villa.setPriceRange(priceRange)
})

Given(
  'a QuotationRequest to villa named {string} from {string} to {string} for {int} adults and {int} children',
  async function (
    this: TestWorld,
    villaName: string,
    fromDate: string,
    toDate: string,
    adults: number,
    children: number
  ) {
    assert.ok(this.villa, 'Villa must be set')
    assert.strictEqual(this.villa!.getName(), villaName, 'Villa name must match')

    try {
      const from = DateUtils.getDate(fromDate)
      const to = DateUtils.getDate(toDate)
      this.quotationRequest = new QuotationRequest(this.villa!, from, to, adults, children)
    } catch (e) {
      this.requestException = e as Error
    }
  }
)

Given('villa named {string} is booked :', async function (this: TestWorld, villaName: string, dataTable: DataTable) {
  assert.ok(this.villa, 'Villa must be set')

  for (const row of dataTable.hashes()) {
    const customer = await this.customerRepository.findCustomerByEmail(new Email(row['customer']!))
    assert.ok(customer, `Customer ${row['customer']} must exist`)

    await this.authenticationGateway.logCustomerIn(customer)

    const from = DateUtils.getDate(row['from']!)
    const to = DateUtils.getDate(row['to']!)
    const adults = parseInt(row['adults']!, 10)
    const children = parseInt(row['children']!, 10)

    const request = new QuotationRequest(this.villa!, from, to, adults, children)
    await this.quotationUseCase.execute(request)
  }
})

When('the customer submits the QuotationRequest', async function (this: TestWorld) {
  if (this.requestException) {
    return
  }

  try {
    this.quotationResponse = await this.quotationUseCase.execute(this.quotationRequest!)
  } catch (e) {
    this.executeException = e as Error
  }
})

Then(
  'an exception {string} should be thrown with message {string}',
  async function (this: TestWorld, exceptionClass: string, expectedMessage: string) {
    const exception = this.requestException || this.executeException
    assert.ok(exception, 'An exception should have been thrown')
    assert.strictEqual(exception.message, expectedMessage, `Expected message "${expectedMessage}" but got "${exception.message}"`)
  }
)

Then(
  'it should be accepted with a total amount of {string}, a tourist tax of {string} unranked and {string} with a 4 star rating ranking and a deposit amount of {string}',
  async function (
    this: TestWorld,
    expectedTotal: string,
    expectedUnrankedTax: string,
    expectedRankedTax: string,
    expectedDeposit: string
  ) {
    assert.ok(this.quotationResponse, 'Quotation response should exist')
    const booking = this.quotationResponse.booking
    assert.ok(booking, 'Booking should exist')

    const pricingContext = booking.getPricingContext()
    const totalAmount = pricingContext.getTotalAmount()
    const unrankedTax = booking.getUnrankedTouristTax()
    const rankedTax = booking.getRankedTouristTax()
    const depositAmount = booking.getVilla().getDepositAmount()

    assert.strictEqual(
      normalizeWhitespace(totalAmount.toString()),
      normalizeWhitespace(expectedTotal),
      `Expected total ${expectedTotal} but got ${totalAmount.toString()}`
    )
    assert.strictEqual(
      normalizeWhitespace(unrankedTax.toString()),
      normalizeWhitespace(expectedUnrankedTax),
      `Expected unranked tax ${expectedUnrankedTax} but got ${unrankedTax.toString()}`
    )
    assert.strictEqual(
      normalizeWhitespace(rankedTax.toString()),
      normalizeWhitespace(expectedRankedTax),
      `Expected ranked tax ${expectedRankedTax} but got ${rankedTax.toString()}`
    )
    assert.strictEqual(
      normalizeWhitespace(depositAmount.toString()),
      normalizeWhitespace(expectedDeposit),
      `Expected deposit ${expectedDeposit} but got ${depositAmount.toString()}`
    )
  }
)

Then('{int} emails should have been sent', async function (this: TestWorld, expectedCount: number) {
  const sentEmails = this.getSentEmails()
  assert.strictEqual(sentEmails.length, expectedCount, `Expected ${expectedCount} emails but got ${sentEmails.length}`)
})

Then(
  'an {string} event at index {int} has been dispatched',
  async function (this: TestWorld, eventClass: string, index: number) {
    const messages = this.getDispatchedMessages()
    assert.ok(messages.length > index, `Expected at least ${index + 1} messages but got ${messages.length}`)

    const message = messages[index]!
    const expectedShortName = eventClass.split('\\').pop()!
    const actualName = message.constructor.name

    assert.ok(
      actualName.includes(expectedShortName.replace('Message', '')) ||
      expectedShortName.includes(actualName),
      `Expected message class "${expectedShortName}" but got "${actualName}"`
    )
  }
)
