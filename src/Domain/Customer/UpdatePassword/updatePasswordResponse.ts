export class UpdatePasswordResponse {
	private constructor(
		readonly success: boolean,
		readonly errors: string[],
	) {}

	static success(): UpdatePasswordResponse {
		return new UpdatePasswordResponse(true, []);
	}

	static failure(errors: string[]): UpdatePasswordResponse {
		return new UpdatePasswordResponse(false, errors);
	}
}
