import type { BookingRepository } from '../../domain/booking/booking-repository.ts'
import type { Booking } from '../../domain/booking/booking.ts'
import type { BookingId } from '../../domain/booking/booking-id.ts'
import type { FormattedBookingDates } from '../../domain/booking/formatted-booking-dates.ts'
import { DateUtils } from '../../domain/shared/date-utils.ts'

export class InMemoryBookingRepository implements BookingRepository {
  private bookings: Booking[] = []

  async isBookingAvailable(bookingDates: FormattedBookingDates): Promise<boolean> {
    if (this.bookings.length === 0) {
      return true
    }

    const from = DateUtils.getDate(bookingDates.from)
    const to = DateUtils.getDate(bookingDates.to)

    for (const booking of this.bookings) {
      if (
        (DateUtils.isAfter(from, booking.getFrom()) && DateUtils.isBefore(from, booking.getTo())) ||
        (DateUtils.isAfter(to, booking.getFrom()) && DateUtils.isBefore(to, booking.getTo()))
      ) {
        return false
      }
    }

    return true
  }

  async save(booking: Booking): Promise<boolean> {
    if (!this.bookings.includes(booking)) {
      this.bookings.push(booking)
      return true
    }
    return false
  }

  async findBookingById(bookingId: BookingId): Promise<Booking | null> {
    const booking = this.bookings.find((b) => b.getId() === bookingId.toString())
    return booking ?? null
  }
}
