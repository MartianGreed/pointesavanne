import type { Price } from "../Pricing/price";

export interface Tax {
	getAmount(): Price;
}
