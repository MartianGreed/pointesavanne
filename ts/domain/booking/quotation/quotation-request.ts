import type { Villa } from '../villa.ts'

export class QuotationRequest {
  constructor(
    public readonly villa: Villa,
    public readonly from: Date,
    public readonly to: Date,
    public readonly adultsCount: number,
    public readonly childrenCount: number = 0
  ) {}
}
