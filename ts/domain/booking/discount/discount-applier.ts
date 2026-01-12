import type { Price } from '../pricing/price.ts'
import type { DiscountAmount } from './discount-amount.ts'

export interface DiscountApplier {
  apply(amount: DiscountAmount, price: Price): Price
}
