export class CustomerNotFoundException extends Error {
	constructor(email: string) {
		super(`Customer with email: ${email} not found`);
		this.name = "CustomerNotFoundException";
	}
}
