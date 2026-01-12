import type { Booking } from './booking.ts'
import type { BookingId } from './booking-id.ts'
import type { FormattedBookingDates } from './formatted-booking-dates.ts'

export interface BookingRepository {
  isBookingAvailable(bookingDates: FormattedBookingDates): Promise<boolean>
  save(booking: Booking): Promise<boolean>
  findBookingById(bookingId: BookingId): Promise<Booking | null>
}
