import { Price } from '../pricing/price.ts'
import { DiscountAmount } from '../discount/discount-amount.ts'
import type { Tax } from './tax.ts'

export class UnrankedTouristTax implements Tax {
  private amount: Price

  constructor(totalAmount: Price, totalOccupants: number, nightCount: number, adultsCount: number) {
    const pricePerNight = new Price(totalAmount.amount / nightCount / totalOccupants)
    const excludedTaxPrice = DiscountAmount.parse('2.5%').apply(pricePerNight)
    let taxPrice = pricePerNight.sub(excludedTaxPrice)

    if (taxPrice.getValue() > 235) {
      taxPrice = new Price(2.35)
    }

    this.amount = new Price((taxPrice.getValue() / 100) * nightCount * adultsCount)
  }

  getAmount(): Price {
    return this.amount
  }
}
