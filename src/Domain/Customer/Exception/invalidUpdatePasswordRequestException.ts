export class InvalidUpdatePasswordRequestException extends Error {
	constructor() {
		super(
			"You have to provide either an email and passwords or a token and a password.",
		);
		this.name = "InvalidUpdatePasswordRequestException";
	}
}
