import type { BookingId } from '../booking-id.ts'
import type { File } from '../../shared/pdf/file.ts'

export class QuotationSignedRequest {
  constructor(
    public readonly bookingId: BookingId,
    public readonly file: File
  ) {}
}
