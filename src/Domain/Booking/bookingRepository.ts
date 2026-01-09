import type { Booking } from "./booking";
import type { BookingId } from "./bookingId";
import type { FormattedBookingDates } from "./formattedBookingDates";

export interface BookingRepository {
	isBookingAvailable(dates: FormattedBookingDates): Promise<boolean>;
	save(booking: Booking): Promise<boolean>;
	findBookingById(id: BookingId): Promise<Booking | null>;
}
