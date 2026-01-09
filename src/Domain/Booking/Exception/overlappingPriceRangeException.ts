import { formatDate } from "../../Shared/dateUtils";
import type { PricingRange } from "../Pricing/range";

export class OverlappingPriceRangeException extends Error {
	constructor(range: PricingRange) {
		super(
			`Range is overlapping with existing range between ${formatDate(range.from)} and ${formatDate(range.to)}`,
		);
		this.name = "OverlappingPriceRangeException";
	}
}
