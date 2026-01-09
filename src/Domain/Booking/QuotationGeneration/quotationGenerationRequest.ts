import type { BookingId } from "../bookingId";

export class QuotationGenerationRequest {
	constructor(readonly bookingId: BookingId) {}
}
