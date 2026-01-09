export class AddressCannotBeNullException extends Error {
	constructor() {
		super("Address cannot be null if customer wants to book.");
		this.name = "AddressCannotBeNullException";
	}
}
