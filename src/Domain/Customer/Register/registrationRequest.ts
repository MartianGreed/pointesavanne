export class RegistrationRequest {
	constructor(
		readonly email: string,
		readonly password: string,
		readonly phoneNumber: string,
		readonly firstname: string,
		readonly lastname: string,
	) {}
}
