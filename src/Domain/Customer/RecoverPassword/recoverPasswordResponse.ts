export class RecoverPasswordResponse {
	private constructor(
		readonly success: boolean,
		readonly errors: string[],
	) {}

	static success(): RecoverPasswordResponse {
		return new RecoverPasswordResponse(true, []);
	}

	static failure(errors: string[]): RecoverPasswordResponse {
		return new RecoverPasswordResponse(false, errors);
	}
}
