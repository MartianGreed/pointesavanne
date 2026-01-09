import { describe, expect, it } from "bun:test";
import { Discount } from "../../../src/Domain/Booking/Discount/discount";
import {
	FlatApplier,
	PercentApplier,
} from "../../../src/Domain/Booking/Discount/discountAmount";
import { DiscountRange } from "../../../src/Domain/Booking/Discount/discountRange";
import { Price } from "../../../src/Domain/Booking/Pricing/price";

describe("Discount", () => {
	describe("FlatApplier", () => {
		it("should apply flat discount", () => {
			const applier = new FlatApplier(Price.fromCents(500));
			const price = Price.fromCents(2000);
			const result = applier.apply(price);
			expect(result.amount).toBe(1500);
		});
	});

	describe("PercentApplier", () => {
		it("should apply percentage discount", () => {
			const applier = new PercentApplier(10);
			const price = Price.fromCents(1000);
			const result = applier.apply(price);
			expect(result.amount).toBe(900);
		});

		it("should throw for invalid percentage", () => {
			expect(() => new PercentApplier(-5)).toThrow(
				"Percentage must be between 0 and 100",
			);
			expect(() => new PercentApplier(150)).toThrow(
				"Percentage must be between 0 and 100",
			);
		});
	});

	describe("DiscountRange", () => {
		it("should check if nights fall within range", () => {
			const range = DiscountRange.create(7, 14, new PercentApplier(10));
			expect(range.appliesTo(7)).toBe(true);
			expect(range.appliesTo(10)).toBe(true);
			expect(range.appliesTo(14)).toBe(true);
			expect(range.appliesTo(6)).toBe(false);
			expect(range.appliesTo(15)).toBe(false);
		});
	});

	describe("Discount", () => {
		it("should find applicable discount for duration", () => {
			const discount = Discount.create()
				.addRange(DiscountRange.create(7, 13, new PercentApplier(5)))
				.addRange(DiscountRange.create(14, 21, new PercentApplier(10)));

			const applier = discount.getDiscountForDuration(10);
			expect(applier).toBeInstanceOf(PercentApplier);

			const noDiscount = discount.getDiscountForDuration(3);
			expect(noDiscount).toBeNull();
		});
	});
});
