import type { Price } from '../pricing/price.ts'

export interface Tax {
  getAmount(): Price
}
