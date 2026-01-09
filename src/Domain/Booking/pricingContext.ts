import { addDays, daysBetween } from "../Shared/dateUtils";
import { Price } from "./Pricing/price";
import { RankedTouristTax } from "./Tax/rankedTouristTax";
import { UnrankedTouristTax } from "./Tax/unrankedTouristTax";
import type { Villa } from "./villa";

export class PricingContext {
	private constructor(
		private readonly prices: Price[],
		private readonly days: number,
		private readonly adultsCount: number,
	) {}

	static create(
		villa: Villa,
		from: Date,
		to: Date,
		adultsCount: number,
	): PricingContext {
		const days = daysBetween(from, to);
		const prices: Price[] = [];
		const applicableRanges = villa.getPricesForPeriod(from, to);

		for (let i = 0; i < days; i++) {
			const currentDate = addDays(from, i);
			const range = applicableRanges.find((r) => r.contains(currentDate));
			if (range) {
				prices.push(range.price.getUnitPrice());
			}
		}

		const discount = villa.getDiscount().getDiscountForDuration(days);
		if (discount) {
			const total = prices.reduce((acc, p) => acc.add(p), Price.zero());
			const discountedTotal = discount.apply(total);
			const dailyDiscountedPrice = Price.fromCents(
				Math.round(discountedTotal.amount / days),
			);
			return new PricingContext(
				Array(days).fill(dailyDiscountedPrice),
				days,
				adultsCount,
			);
		}

		return new PricingContext(prices, days, adultsCount);
	}

	getPrices(): Price[] {
		return [...this.prices];
	}

	getTotalAmount(): Price {
		return this.prices.reduce((acc, p) => acc.add(p), Price.zero());
	}

	getUnrankedTouristTax(): Price {
		const tax = new UnrankedTouristTax(
			this.days,
			this.adultsCount,
			this.getTotalAmount(),
		);
		return tax.getAmount();
	}

	getRankedTouristTax(): Price {
		const tax = new RankedTouristTax(this.days, this.adultsCount);
		return tax.getAmount();
	}
}
