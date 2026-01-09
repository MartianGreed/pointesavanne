import { describe, expect, it } from "bun:test";
import { Price } from "../../../src/Domain/Booking/Pricing/price";

describe("Price", () => {
	describe("creation", () => {
		it("should create price from cents", () => {
			const price = Price.fromCents(1000);
			expect(price.amount).toBe(1000);
			expect(price.toEuros()).toBe(10);
		});

		it("should create price from euros", () => {
			const price = Price.fromEuros(10);
			expect(price.amount).toBe(1000);
		});

		it("should create zero price", () => {
			const price = Price.zero();
			expect(price.amount).toBe(0);
		});
	});

	describe("operations", () => {
		it("should add prices", () => {
			const price1 = Price.fromCents(1000);
			const price2 = Price.fromCents(500);
			const result = price1.add(price2);
			expect(result.amount).toBe(1500);
		});

		it("should subtract prices", () => {
			const price1 = Price.fromCents(1000);
			const price2 = Price.fromCents(300);
			const result = price1.sub(price2);
			expect(result.amount).toBe(700);
		});

		it("should multiply price by factor", () => {
			const price = Price.fromCents(1000);
			const result = price.multiply(0.9);
			expect(result.amount).toBe(900);
		});

		it("should throw when operating on different currencies", () => {
			const price1 = Price.fromCents(1000, "EUR");
			const price2 = Price.fromCents(500, "USD");
			expect(() => price1.add(price2)).toThrow("different currencies");
		});
	});

	describe("formatting", () => {
		it("should format amount in French locale", () => {
			const price = Price.fromCents(1050);
			const formatted = price.getFormattedAmount();
			expect(formatted).toContain("10");
		});
	});

	describe("equality", () => {
		it("should compare equal prices", () => {
			const price1 = Price.fromCents(1000);
			const price2 = Price.fromCents(1000);
			expect(price1.equals(price2)).toBe(true);
		});

		it("should compare different amounts", () => {
			const price1 = Price.fromCents(1000);
			const price2 = Price.fromCents(500);
			expect(price1.equals(price2)).toBe(false);
		});
	});
});
