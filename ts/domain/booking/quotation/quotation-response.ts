import type { Booking } from '../booking.ts'

export class QuotationResponse {
  constructor(public readonly booking: Booking) {}
}
