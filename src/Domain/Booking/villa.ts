import type { Discount } from "./Discount/discount";
import type { Price } from "./Pricing/price";
import type { PricingRange } from "./Pricing/range";

export class Villa {
	private constructor(
		readonly name: string,
		readonly caution: Price,
		readonly household: Price,
		readonly priceRanges: PricingRange[],
		readonly discount: Discount,
	) {}

	static create(
		name: string,
		caution: Price,
		household: Price,
		priceRanges: PricingRange[],
		discount: Discount,
	): Villa {
		return new Villa(name, caution, household, priceRanges, discount);
	}

	getPricesForPeriod(from: Date, to: Date): PricingRange[] {
		return this.priceRanges.filter((range) => range.overlaps(from, to));
	}

	getDepositAmount(): Price {
		return this.caution;
	}

	getHouseholdAmount(): Price {
		return this.household;
	}

	getDiscount(): Discount {
		return this.discount;
	}
}
