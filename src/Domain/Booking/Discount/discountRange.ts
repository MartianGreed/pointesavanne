import type { DiscountAmount } from "./discountAmount";

export class DiscountRange {
	constructor(
		readonly from: number,
		readonly to: number,
		readonly amount: DiscountAmount,
	) {
		if (from > to) {
			throw new Error(
				"Discount range 'from' must be less than or equal to 'to'",
			);
		}
	}

	static create(
		from: number,
		to: number,
		amount: DiscountAmount,
	): DiscountRange {
		return new DiscountRange(from, to, amount);
	}

	appliesTo(nights: number): boolean {
		return nights >= this.from && nights <= this.to;
	}
}
