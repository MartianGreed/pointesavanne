import type { DiscountAmount } from "./discountAmount";
import type { DiscountRange } from "./discountRange";

export class Discount {
	private constructor(private readonly ranges: DiscountRange[]) {}

	static create(): Discount {
		return new Discount([]);
	}

	addRange(range: DiscountRange): Discount {
		return new Discount([...this.ranges, range]);
	}

	getDiscountForDuration(nights: number): DiscountAmount | null {
		const range = this.ranges.find((r) => r.appliesTo(nights));
		return range?.amount ?? null;
	}
}
