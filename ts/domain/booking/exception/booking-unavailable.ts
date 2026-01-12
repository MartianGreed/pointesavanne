import type { FormattedBookingDates } from '../formatted-booking-dates.ts'

export class BookingUnavailableException extends Error {
  constructor(bookingDates: FormattedBookingDates) {
    super(`Booking is unavailable for dates ${bookingDates.from} - ${bookingDates.to}`)
    this.name = 'BookingUnavailableException'
  }
}
