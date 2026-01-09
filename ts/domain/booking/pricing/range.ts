import { Price } from './price.ts'

export class Range {
  constructor(
    public readonly from: Date,
    public readonly to: Date,
    public readonly price: Price
  ) {}
}
