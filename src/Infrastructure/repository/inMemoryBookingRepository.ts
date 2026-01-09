import type { Booking } from "../../Domain/Booking/booking";
import type { BookingId } from "../../Domain/Booking/bookingId";
import type { BookingRepository } from "../../Domain/Booking/bookingRepository";
import type { FormattedBookingDates } from "../../Domain/Booking/formattedBookingDates";

export class InMemoryBookingRepository implements BookingRepository {
	private bookings: Map<string, Booking> = new Map();

	async isBookingAvailable(dates: FormattedBookingDates): Promise<boolean> {
		for (const booking of this.bookings.values()) {
			if (this.datesOverlap(booking.from, booking.to, dates.from, dates.to)) {
				return false;
			}
		}
		return true;
	}

	async save(booking: Booking): Promise<boolean> {
		this.bookings.set(booking.id.toString(), booking);
		return true;
	}

	async findBookingById(id: BookingId): Promise<Booking | null> {
		return this.bookings.get(id.toString()) ?? null;
	}

	private datesOverlap(
		existingFrom: Date,
		existingTo: Date,
		newFrom: Date,
		newTo: Date,
	): boolean {
		return existingFrom < newTo && existingTo > newFrom;
	}

	clear(): void {
		this.bookings.clear();
	}
}
