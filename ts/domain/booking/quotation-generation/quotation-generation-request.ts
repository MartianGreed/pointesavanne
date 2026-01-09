import type { BookingId } from '../booking-id.ts'

export class QuotationGenerationRequest {
  constructor(public readonly bookingId: BookingId) {}
}
