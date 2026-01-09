import type { Price } from "./price";

export class PricingRange {
	constructor(
		readonly from: Date,
		readonly to: Date,
		readonly price: Price,
	) {
		if (from > to) {
			throw new Error("Range start date must be before end date");
		}
	}

	static create(from: Date, to: Date, price: Price): PricingRange {
		return new PricingRange(from, to, price);
	}

	contains(date: Date): boolean {
		return date >= this.from && date <= this.to;
	}

	overlaps(from: Date, to: Date): boolean {
		return this.from <= to && this.to >= from;
	}
}
