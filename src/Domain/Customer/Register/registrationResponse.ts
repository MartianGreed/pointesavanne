export class RegistrationResponse {
	private constructor(
		readonly success: boolean,
		readonly errors: string[],
	) {}

	static success(): RegistrationResponse {
		return new RegistrationResponse(true, []);
	}

	static failure(errors: string[]): RegistrationResponse {
		return new RegistrationResponse(false, errors);
	}
}
