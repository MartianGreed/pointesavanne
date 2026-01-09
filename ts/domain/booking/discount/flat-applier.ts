import { Price } from '../pricing/price.ts'
import type { DiscountApplier } from './discount-applier.ts'
import type { DiscountAmount } from './discount-amount.ts'

export class FlatApplier implements DiscountApplier {
  apply(amount: DiscountAmount, price: Price): Price {
    return price.sub(new Price(amount.advantageValue))
  }
}
