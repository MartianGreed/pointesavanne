import { Range } from './range.ts'

export class Discount {
  private ranges: Range[] = []

  addRange(range: Range): this {
    this.ranges.push(range)
    return this
  }

  getDiscountForDuration(currentNight: number): Range | null {
    for (const range of this.ranges) {
      if (currentNight < range.from || currentNight > range.to) {
        continue
      }
      return range
    }

    return null
  }
}
