import { Price } from './pricing/price.ts'
import { PriceRange } from './pricing/price-range.ts'
import { Range as PricingRange } from './pricing/range.ts'
import { Discount } from './discount/discount.ts'
import { DateUtils } from '../shared/date-utils.ts'

export class Villa {
  private priceRange!: PriceRange
  private discount!: Discount

  constructor(
    private name: string,
    private caution: Price,
    private household: Price
  ) {}

  getDepositAmount(): Price {
    return this.caution
  }

  setPriceRange(priceRange: PriceRange): this {
    this.priceRange = priceRange
    return this
  }

  setDiscount(discount: Discount): this {
    this.discount = discount
    return this
  }

  getPricesForPeriod(from: Date, to: Date): [PricingRange | null, PricingRange | null] {
    let rangeStart: PricingRange | null = null
    let rangeEnd: PricingRange | null = null

    for (const range of this.priceRange.getIterator()) {
      if (DateUtils.isWithin(from, range.from, range.to)) {
        rangeStart = range
      }

      if (DateUtils.isWithin(to, range.from, range.to)) {
        rangeEnd = range
      }
    }

    return [rangeStart, rangeEnd]
  }

  getName(): string {
    return this.name
  }

  getDiscount(): Discount {
    return this.discount
  }

  getHouseholdAmount(): Price {
    return this.household
  }
}
