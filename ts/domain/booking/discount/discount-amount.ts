import { Price } from '../pricing/price.ts'
import type { DiscountApplier } from './discount-applier.ts'
import { FlatApplier } from './flat-applier.ts'
import { PercentApplier } from './percent-applier.ts'

export class DiscountAmount {
  constructor(
    public readonly advantageValue: number,
    public readonly advantageType: string
  ) {}

  static parse(value: string): DiscountAmount {
    const match = value.match(/(\d+(?:[., ]\d+)?)/)
    const amount = match ? parseFloat(match[1]!.replace(/[, ]/g, '.')) : 0
    const type = value.replace(/[\d., ]/g, '').trim()

    return new DiscountAmount(amount, type)
  }

  apply(price: Price): Price {
    return this.getApplier().apply(this, price)
  }

  private getApplier(): DiscountApplier {
    switch (this.advantageType) {
      case '%':
        return new PercentApplier()
      default:
        return new FlatApplier()
    }
  }
}
