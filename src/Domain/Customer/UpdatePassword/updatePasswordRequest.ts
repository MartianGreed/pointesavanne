export class UpdatePasswordRequest {
	constructor(
		readonly token: string,
		readonly newPassword: string,
	) {}
}
