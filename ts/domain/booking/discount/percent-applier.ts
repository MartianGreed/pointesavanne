import { Price } from '../pricing/price.ts'
import type { DiscountApplier } from './discount-applier.ts'
import type { DiscountAmount } from './discount-amount.ts'

export class PercentApplier implements DiscountApplier {
  apply(amount: DiscountAmount, price: Price): Price {
    const discountAmount = new Price(((amount.advantageValue / 100) * price.getValue()) / 100)
    return price.sub(discountAmount)
  }
}
