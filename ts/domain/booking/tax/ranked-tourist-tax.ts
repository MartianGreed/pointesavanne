import { Price } from '../pricing/price.ts'
import { DateUtils } from '../../shared/date-utils.ts'
import type { Tax } from './tax.ts'

export class RankedTouristTax implements Tax {
  private static readonly UNIT_AMOUNT = 1.5
  private amount: Price

  constructor(from: Date, to: Date, adultsCount: number) {
    const days = DateUtils.daysBetween(from, to)
    this.amount = new Price(days * adultsCount * RankedTouristTax.UNIT_AMOUNT)
  }

  getAmount(): Price {
    return this.amount
  }
}
