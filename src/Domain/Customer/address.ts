export class Address {
	constructor(
		readonly line1: string,
		readonly line2: string | null = null,
		readonly line3: string | null = null,
	) {}

	static create(
		line1: string,
		line2?: string | null,
		line3?: string | null,
	): Address {
		return new Address(line1, line2 ?? null, line3 ?? null);
	}
}
