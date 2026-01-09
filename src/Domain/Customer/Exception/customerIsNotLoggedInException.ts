export class CustomerIsNotLoggedInException extends Error {
	constructor(sessionId: string) {
		super(`Cannot find logged in customer for session with id: ${sessionId}`);
		this.name = "CustomerIsNotLoggedInException";
	}
}
