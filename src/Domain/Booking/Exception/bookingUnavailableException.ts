import { formatDate } from "../../Shared/dateUtils";
import type { FormattedBookingDates } from "../formattedBookingDates";

export class BookingUnavailableException extends Error {
	constructor(bookingDates: FormattedBookingDates) {
		super(
			`Booking is not available from ${formatDate(bookingDates.from)} to ${formatDate(bookingDates.to)}`,
		);
		this.name = "BookingUnavailableException";
	}
}
