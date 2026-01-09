import { Uuid } from "../Shared/uuid";

export class RecoverPassword {
	private constructor(
		readonly token: string,
		readonly requestedAt: Date,
		readonly expireAt: Date,
	) {}

	static recordNow(token?: string): RecoverPassword {
		const requestedAt = new Date();
		const expireAt = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
		return new RecoverPassword(token ?? Uuid.generate(), requestedAt, expireAt);
	}

	isExpired(): boolean {
		return new Date() > this.expireAt;
	}
}
