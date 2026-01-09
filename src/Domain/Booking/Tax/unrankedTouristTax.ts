import { Price } from "../Pricing/price";
import type { Tax } from "./tax";

export class UnrankedTouristTax implements Tax {
	private static readonly MAX_RATE_PER_PERSON_PER_DAY = 235;

	constructor(
		private readonly days: number,
		private readonly adultsCount: number,
		private readonly totalAccommodationPrice: Price,
	) {}

	getAmount(): Price {
		const ratePerPersonPerDay = Math.min(
			this.calculateOccupancyRate(),
			UnrankedTouristTax.MAX_RATE_PER_PERSON_PER_DAY,
		);

		const amount = this.days * this.adultsCount * ratePerPersonPerDay;
		return Price.fromCents(Math.round(amount));
	}

	private calculateOccupancyRate(): number {
		if (this.days === 0 || this.adultsCount === 0) {
			return 0;
		}
		const pricePerPersonPerDay =
			this.totalAccommodationPrice.amount / (this.days * this.adultsCount);
		return pricePerPersonPerDay * 0.05;
	}
}
