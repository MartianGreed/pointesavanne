import type { Villa } from "../villa";

export class QuotationRequest {
	constructor(
		readonly villa: Villa,
		readonly from: Date,
		readonly to: Date,
		readonly adultsCount: number,
		readonly childrenCount: number,
	) {}
}
