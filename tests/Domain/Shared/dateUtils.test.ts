import { describe, expect, it } from "bun:test";
import {
	addDays,
	daysBetween,
	isAfter,
	isBefore,
	isWithin,
} from "../../../src/Domain/Shared/dateUtils";

describe("dateUtils", () => {
	describe("isBefore", () => {
		it("should return true when date is before reference", () => {
			const date = new Date("2024-01-01");
			const reference = new Date("2024-01-02");
			expect(isBefore(date, reference)).toBe(true);
		});

		it("should return false when date is after reference", () => {
			const date = new Date("2024-01-02");
			const reference = new Date("2024-01-01");
			expect(isBefore(date, reference)).toBe(false);
		});
	});

	describe("isAfter", () => {
		it("should return true when date is after reference", () => {
			const date = new Date("2024-01-02");
			const reference = new Date("2024-01-01");
			expect(isAfter(date, reference)).toBe(true);
		});

		it("should return false when date is before reference", () => {
			const date = new Date("2024-01-01");
			const reference = new Date("2024-01-02");
			expect(isAfter(date, reference)).toBe(false);
		});
	});

	describe("isWithin", () => {
		it("should return true when date is within range", () => {
			const date = new Date("2024-01-15");
			const from = new Date("2024-01-01");
			const to = new Date("2024-01-31");
			expect(isWithin(date, from, to)).toBe(true);
		});

		it("should return false when date is outside range", () => {
			const date = new Date("2024-02-15");
			const from = new Date("2024-01-01");
			const to = new Date("2024-01-31");
			expect(isWithin(date, from, to)).toBe(false);
		});
	});

	describe("daysBetween", () => {
		it("should calculate days between two dates", () => {
			const from = new Date("2024-01-01");
			const to = new Date("2024-01-08");
			expect(daysBetween(from, to)).toBe(7);
		});
	});

	describe("addDays", () => {
		it("should add days to a date", () => {
			const date = new Date("2024-01-01");
			const result = addDays(date, 5);
			expect(result.getDate()).toBe(6);
		});
	});
});
