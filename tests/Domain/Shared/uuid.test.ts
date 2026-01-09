import { describe, expect, it } from "bun:test";
import { Uuid } from "../../../src/Domain/Shared/uuid";

class TestUuid extends Uuid {
	// biome-ignore lint/complexity/noUselessConstructor: Required to expose protected parent constructor
	constructor(value: string) {
		super(value);
	}
}

describe("Uuid", () => {
	it("should generate valid UUIDs", () => {
		const uuid = Uuid.generate();
		expect(Uuid.isValidUuid(uuid)).toBe(true);
	});

	it("should validate correct UUID format", () => {
		expect(Uuid.isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
	});

	it("should reject invalid UUID format", () => {
		expect(Uuid.isValidUuid("not-a-uuid")).toBe(false);
		expect(Uuid.isValidUuid("")).toBe(false);
	});

	it("should create uuid from valid string", () => {
		const uuid = new TestUuid("550e8400-e29b-41d4-a716-446655440000");
		expect(uuid.toString()).toBe("550e8400-e29b-41d4-a716-446655440000");
	});

	it("should throw for invalid uuid string", () => {
		expect(() => new TestUuid("invalid")).toThrow("Invalid UUID");
	});

	it("should compare equality correctly", () => {
		const uuid1 = new TestUuid("550e8400-e29b-41d4-a716-446655440000");
		const uuid2 = new TestUuid("550e8400-e29b-41d4-a716-446655440000");
		const uuid3 = new TestUuid("550e8400-e29b-41d4-a716-446655440001");
		expect(uuid1.equals(uuid2)).toBe(true);
		expect(uuid1.equals(uuid3)).toBe(false);
	});
});
