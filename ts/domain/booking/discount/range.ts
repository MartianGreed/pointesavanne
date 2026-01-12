import { DiscountAmount } from './discount-amount.ts'

export class Range {
  constructor(
    public readonly from: number,
    public readonly to: number,
    public readonly amount: DiscountAmount
  ) {}
}
