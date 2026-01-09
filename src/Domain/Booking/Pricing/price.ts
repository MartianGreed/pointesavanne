export class Price {
	private constructor(
		readonly amount: number,
		readonly currency: string = "EUR",
	) {}

	static fromCents(cents: number, currency = "EUR"): Price {
		return new Price(cents, currency);
	}

	static fromEuros(euros: number, currency = "EUR"): Price {
		return new Price(Math.round(euros * 100), currency);
	}

	static zero(currency = "EUR"): Price {
		return new Price(0, currency);
	}

	add(other: Price): Price {
		this.assertSameCurrency(other);
		return new Price(this.amount + other.amount, this.currency);
	}

	sub(other: Price): Price {
		this.assertSameCurrency(other);
		return new Price(this.amount - other.amount, this.currency);
	}

	multiply(factor: number): Price {
		return new Price(Math.round(this.amount * factor), this.currency);
	}

	getUnitPrice(): Price {
		return new Price(Math.round(this.amount / 7), this.currency);
	}

	getFormattedAmount(): string {
		const euros = this.amount / 100;
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: this.currency,
		}).format(euros);
	}

	toEuros(): number {
		return this.amount / 100;
	}

	toString(): string {
		return this.getFormattedAmount();
	}

	equals(other: Price): boolean {
		return this.amount === other.amount && this.currency === other.currency;
	}

	private assertSameCurrency(other: Price): void {
		if (this.currency !== other.currency) {
			throw new Error(
				`Cannot operate on prices with different currencies: ${this.currency} vs ${other.currency}`,
			);
		}
	}
}
