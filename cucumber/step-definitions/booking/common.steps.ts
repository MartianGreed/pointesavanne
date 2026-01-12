import { Given, Then, DataTable } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../../support/world.ts'
import { Villa } from '../../../ts/domain/booking/villa.ts'
import { Discount } from '../../../ts/domain/booking/discount/discount.ts'
import { Range as DiscountRange } from '../../../ts/domain/booking/discount/range.ts'
import { DiscountAmount } from '../../../ts/domain/booking/discount/discount-amount.ts'
import { PriceRange } from '../../../ts/domain/booking/pricing/price-range.ts'
import { Range as PricingRange } from '../../../ts/domain/booking/pricing/range.ts'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'
import { Status } from '../../../ts/domain/booking/status.ts'

Given(
  'a villa {string} with a caution amount of {string} and the mandatory household of {string}',
  async function (this: TestWorld, name: string, amount: string, householdAmount: string) {
    this.villa = new Villa(name, this.priceParser.parse(amount), this.priceParser.parse(householdAmount))
  }
)

Given('a discount over time set as :', async function (this: TestWorld, dataTable: DataTable) {
  this.discount = new Discount()
  const rows = dataTable.hashes()
  for (const row of rows) {
    this.discount.addRange(
      new DiscountRange(parseInt(row.from!, 10), parseInt(row.to!, 10), DiscountAmount.parse(row.discountAmount!))
    )
  }
})

Given('the following pricing range :', async function (this: TestWorld, dataTable: DataTable) {
  const priceRange = new PriceRange()
  const rows = dataTable.hashes()
  for (const row of rows) {
    priceRange.addRange(
      new PricingRange(DateUtils.getDate(row.from!), DateUtils.getDate(row.to!), this.priceParser.parse(row.baseAmount!))
    )
  }

  this.villa!.setPriceRange(priceRange).setDiscount(this.discount!)
})

Then('{int} emails should have been sent', async function (this: TestWorld, emailCount: number) {
  assert.strictEqual(this.mailer.getSent().length, emailCount, `Expected ${emailCount} emails to be sent`)
})

Then('an {string} event at index {int} has been dispatched', async function (this: TestWorld, messageClass: string, index: number) {
  const messages = this.messageQueue.getDispatchedMessages()
  assert.ok(messages.length > index, `Expected at least ${index + 1} messages to be dispatched`)
  const expectedClassName = messageClass.split('\\').pop()!
  const actualClassName = messages[index]!.constructor.name
  assert.strictEqual(actualClassName, expectedClassName, `Expected message class ${expectedClassName} at index ${index}`)
})

Given('villa named {string} is booked :', async function (this: TestWorld, _villaName: string, dataTable: DataTable) {
  const { QuotationRequest } = await import('../../../ts/domain/booking/quotation/quotation-request.ts')
  const rows = dataTable.hashes()
  for (const row of rows) {
    await this.quotationUseCase.execute(
      new QuotationRequest(
        this.villa!,
        DateUtils.getDate(row.from!),
        DateUtils.getDate(row.to!),
        parseInt(row.adults!, 10),
        parseInt(row.children!, 10)
      )
    )
  }
})

Then('the booking should in state {string}', async function (this: TestWorld, state: string) {
  assert.notStrictEqual(this.booking, null, 'Booking should not be null')
  const statusMap: Record<string, Status> = {
    'quotation-requested': Status.QUOTATION_REQUESTED,
    'quotation-awaiting-acceptation': Status.QUOTATION_AWAITING_ACCEPTATION,
    'quotation-signed': Status.QUOTATION_SIGNED
  }
  const expectedStatus = statusMap[state]
  assert.ok(expectedStatus !== undefined, `Unknown status: ${state}`)
  assert.strictEqual(this.booking!.getStatus(), expectedStatus, `Booking should be in state ${state}`)
})
