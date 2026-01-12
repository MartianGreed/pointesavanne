import type { Booking } from '../booking.ts'
import type { File } from '../../shared/pdf/file.ts'

export class QuotationGenerationResponse {
  constructor(
    public readonly booking: Booking,
    public readonly file: File
  ) {}
}
