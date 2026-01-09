import { describe, expect, it } from "bun:test";
import { Email } from "../../../src/Domain/Customer/email";

describe("Email", () => {
	it("should create valid email", () => {
		const email = Email.create("test@example.com");
		expect(email.toString()).toBe("test@example.com");
	});

	it("should lowercase email", () => {
		const email = Email.create("Test@Example.COM");
		expect(email.toString()).toBe("test@example.com");
	});

	it("should throw for invalid email", () => {
		expect(() => Email.create("invalid")).toThrow("Invalid email");
		expect(() => Email.create("")).toThrow("Invalid email");
		expect(() => Email.create("@example.com")).toThrow("Invalid email");
	});

	it("should compare equality", () => {
		const email1 = Email.create("test@example.com");
		const email2 = Email.create("test@example.com");
		const email3 = Email.create("other@example.com");
		expect(email1.equals(email2)).toBe(true);
		expect(email1.equals(email3)).toBe(false);
	});
});
