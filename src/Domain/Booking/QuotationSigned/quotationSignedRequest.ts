import type { BookingId } from "../bookingId";

export class QuotationSignedRequest {
	constructor(
		readonly bookingId: BookingId,
		readonly signedQuotationFilePath: string,
	) {}
}
