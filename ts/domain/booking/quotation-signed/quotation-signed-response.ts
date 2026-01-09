import type { Booking } from '../booking.ts'
import type { File } from '../../shared/pdf/file.ts'

export class QuotationSignedResponse {
  constructor(
    public readonly booking: Booking,
    public readonly signedQuotation: File
  ) {}
}
