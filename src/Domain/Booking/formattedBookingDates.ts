export class FormattedBookingDates {
	constructor(
		readonly from: Date,
		readonly to: Date,
	) {
		if (from >= to) {
			throw new Error("End date must be after start date");
		}
	}

	static create(from: Date, to: Date): FormattedBookingDates {
		return new FormattedBookingDates(from, to);
	}
}
