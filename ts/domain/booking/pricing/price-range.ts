import { Range } from './range.ts'
import { OverlappingPriceRangeException } from '../exception/overlapping-price-range.ts'

export class PriceRange {
  private ranges: Range[] = []

  addRange(range: Range): this {
    if (this.isOverlapping(range)) {
      throw new OverlappingPriceRangeException(range)
    }

    this.ranges.push(range)
    return this
  }

  private isOverlapping(_range: Range): boolean {
    return false
  }

  getIterator(): IterableIterator<Range> {
    return this.ranges[Symbol.iterator]()
  }
}
