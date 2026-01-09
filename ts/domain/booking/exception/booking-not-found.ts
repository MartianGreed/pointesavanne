export class BookingNotFoundException extends Error {
  constructor(bookingId: string) {
    super(`Booking with id "${bookingId}" not found`)
    this.name = 'BookingNotFoundException'
  }
}
