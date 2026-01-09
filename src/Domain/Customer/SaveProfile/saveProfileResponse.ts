export class SaveProfileResponse {
	private constructor(
		readonly success: boolean,
		readonly errors: string[],
	) {}

	static success(): SaveProfileResponse {
		return new SaveProfileResponse(true, []);
	}

	static failure(errors: string[]): SaveProfileResponse {
		return new SaveProfileResponse(false, errors);
	}
}
