export class Email {
	private constructor(readonly value: string) {}

	static create(value: string): Email {
		if (!Email.isValid(value)) {
			throw new Error(`Invalid email: ${value}`);
		}
		return new Email(value.toLowerCase());
	}

	static isValid(value: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value);
	}

	toString(): string {
		return this.value;
	}

	equals(other: Email): boolean {
		return this.value === other.value;
	}
}
