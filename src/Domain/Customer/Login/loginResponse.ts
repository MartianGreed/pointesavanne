export class LoginResponse {
	private constructor(
		readonly success: boolean,
		readonly sessionId: string | null,
		readonly errors: string[],
	) {}

	static success(sessionId: string): LoginResponse {
		return new LoginResponse(true, sessionId, []);
	}

	static failure(errors: string[]): LoginResponse {
		return new LoginResponse(false, null, errors);
	}
}
