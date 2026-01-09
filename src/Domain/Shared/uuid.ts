export abstract class Uuid {
	protected constructor(protected readonly value: string) {
		if (!Uuid.isValidUuid(value)) {
			throw new Error(`Invalid UUID: ${value}`);
		}
	}

	static isValidUuid(value: string): boolean {
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	}

	static generate(): string {
		return crypto.randomUUID();
	}

	toString(): string {
		return this.value;
	}

	equals(other: Uuid): boolean {
		return this.value === other.value;
	}
}
