export class InvalidBookingEndDateException extends Error {
	constructor(from: string, to: string) {
		super(`End date (${to}) cannot be before beginning date (${from})`);
		this.name = "InvalidBookingEndDateException";
	}
}
