import { Price } from "../Pricing/price";
import type { Tax } from "./tax";

export class RankedTouristTax implements Tax {
	private static readonly RATE_PER_PERSON_PER_DAY = 150;

	constructor(
		private readonly days: number,
		private readonly adultsCount: number,
	) {}

	getAmount(): Price {
		const amount =
			this.days * this.adultsCount * RankedTouristTax.RATE_PER_PERSON_PER_DAY;
		return Price.fromCents(amount);
	}
}
