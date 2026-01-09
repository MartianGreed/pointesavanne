import type { Booking } from "../booking";

export class QuotationResponse {
	private constructor(
		readonly success: boolean,
		readonly booking: Booking | null,
		readonly errors: string[],
	) {}

	static success(booking: Booking): QuotationResponse {
		return new QuotationResponse(true, booking, []);
	}

	static failure(errors: string[]): QuotationResponse {
		return new QuotationResponse(false, null, errors);
	}
}
