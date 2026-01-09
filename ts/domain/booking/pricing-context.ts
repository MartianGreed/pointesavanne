import { Villa } from './villa.ts'
import { Price } from './pricing/price.ts'
import { Range as PricingRange } from './pricing/range.ts'
import { Discount } from './discount/discount.ts'
import { UnrankedTouristTax } from './tax/unranked-tourist-tax.ts'
import { RankedTouristTax } from './tax/ranked-tourist-tax.ts'
import { DateUtils } from '../shared/date-utils.ts'

export class PricingContext {
  private villa!: Villa
  private rangeStart!: PricingRange
  private rangeEnd!: PricingRange
  private prices: Price[] = []

  static create(villa: Villa, from: Date, to: Date): PricingContext {
    const context = new PricingContext()
    context.villa = villa

    const [rangeStart, rangeEnd] = villa.getPricesForPeriod(from, to)
    if (rangeStart === null || rangeEnd === null) {
      throw new Error('Cannot create pricing context from null ranges')
    }

    context.rangeStart = rangeStart
    context.rangeEnd = rangeEnd

    context.computePrices(from, to)

    return context
  }

  getPrices(): Price[] {
    return this.prices
  }

  getTotalAmount(): Price {
    return this.prices.reduce((sum, price) => sum.add(price), new Price(0))
  }

  getUnrankedTouristTax(from: Date, to: Date, totalOccupants: number, adultsCount: number): Price {
    return new UnrankedTouristTax(
      this.getTotalAmount(),
      totalOccupants,
      DateUtils.daysBetween(from, to),
      adultsCount
    ).getAmount()
  }

  getRankedTouristTax(from: Date, to: Date, totalOccupants: number): Price {
    return new RankedTouristTax(from, to, totalOccupants).getAmount()
  }

  private computePrices(from: Date, to: Date): void {
    const currentDate = new Date(from)
    const discount = this.villa.getDiscount()

    const rangeStartPrices = this.computePricesForSingleRange(
      from,
      to,
      currentDate,
      this.rangeStart,
      discount,
      false,
      true
    )
    const rangeEndPrices = this.computePricesForSingleRange(from, to, currentDate, this.rangeEnd, discount, true)

    this.prices = [...rangeStartPrices, ...rangeEndPrices]
  }

  private computePricesForSingleRange(
    from: Date,
    to: Date,
    currentDate: Date,
    priceRange: PricingRange,
    discount: Discount,
    withHead: boolean = false,
    withTail: boolean = false
  ): Price[] {
    const prices: Price[] = []

    while (
      DateUtils.isWithin(currentDate, priceRange.from, priceRange.to, withHead, withTail) &&
      DateUtils.isBefore(currentDate, to)
    ) {
      currentDate.setDate(currentDate.getDate() + 1)

      const currentNight = DateUtils.daysBetween(from, currentDate)
      const currentDiscount = discount.getDiscountForDuration(currentNight)

      let price = priceRange.price
      if (currentDiscount !== null) {
        price = currentDiscount.amount.apply(price)
      }

      prices.push(price.getUnitPrice())
    }

    return prices
  }
}
