export class BookingNotFoundException extends Error {
	constructor(bookingId: string) {
		super(`Booking not found for id: ${bookingId}`);
		this.name = "BookingNotFoundException";
	}
}
