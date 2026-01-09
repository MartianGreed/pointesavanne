export class LoginRequest {
	constructor(
		readonly email: string,
		readonly plainPassword: string,
	) {}
}
