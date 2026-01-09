import type { Price } from "../Pricing/price";

export abstract class DiscountAmount {
	abstract apply(price: Price): Price;
}

export class FlatApplier extends DiscountAmount {
	constructor(readonly amount: Price) {
		super();
	}

	apply(price: Price): Price {
		return price.sub(this.amount);
	}
}

export class PercentApplier extends DiscountAmount {
	constructor(readonly percentage: number) {
		super();
		if (percentage < 0 || percentage > 100) {
			throw new Error("Percentage must be between 0 and 100");
		}
	}

	apply(price: Price): Price {
		const factor = 1 - this.percentage / 100;
		return price.multiply(factor);
	}
}
