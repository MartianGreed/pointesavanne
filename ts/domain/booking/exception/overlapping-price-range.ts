import type { Range } from '../pricing/range.ts'

export class OverlappingPriceRangeException extends Error {
  constructor(range: Range) {
    super(`Price range from ${range.from.toISOString()} to ${range.to.toISOString()} overlaps with existing range`)
    this.name = 'OverlappingPriceRangeException'
  }
}
