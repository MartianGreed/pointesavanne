export class UnsupportedCurrencyException extends Error {
	constructor(symbol: string) {
		super(`Currency ${symbol} is not supported yet.`);
		this.name = "UnsupportedCurrencyException";
	}
}
