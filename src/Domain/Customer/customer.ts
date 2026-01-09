import type { Address } from "./address";
import { CustomerId } from "./customerId";
import { Email } from "./email";
import { Profile } from "./profile";
import { RecoverPassword } from "./recoverPassword";
import { Roles } from "./roles";

export class Customer {
	private constructor(
		readonly id: CustomerId,
		readonly email: Email,
		private _password: string,
		private _profile: Profile,
		private _address: Address | null,
		private _roles: Roles,
		private _recoverPasswordRequest: RecoverPassword | null,
		readonly createdAt: Date,
		private _updatedAt: Date,
		private _lastLoginAt: Date | null,
	) {}

	static register(
		email: string,
		encodedPassword: string,
		phoneNumber: string,
		firstname: string,
		lastname: string,
	): Customer {
		const now = new Date();
		return new Customer(
			CustomerId.build(),
			Email.create(email),
			encodedPassword,
			Profile.create(firstname, lastname, phoneNumber),
			null,
			Roles.default(),
			null,
			now,
			now,
			null,
		);
	}

	get password(): string {
		return this._password;
	}

	get profile(): Profile {
		return this._profile;
	}

	get address(): Address | null {
		return this._address;
	}

	get roles(): Roles {
		return this._roles;
	}

	get recoverPasswordRequest(): RecoverPassword | null {
		return this._recoverPasswordRequest;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get lastLoginAt(): Date | null {
		return this._lastLoginAt;
	}

	logIn(): void {
		this._lastLoginAt = new Date();
		this._updatedAt = new Date();
	}

	updateProfile(updates: {
		firstname?: string;
		lastname?: string;
		phoneNumber?: string;
		language?: string;
		address?: Address | null;
	}): void {
		if (updates.firstname !== undefined) {
			this._profile = this._profile.withFirstname(updates.firstname);
		}
		if (updates.lastname !== undefined) {
			this._profile = this._profile.withLastname(updates.lastname);
		}
		if (updates.phoneNumber !== undefined) {
			this._profile = this._profile.withPhoneNumber(updates.phoneNumber);
		}
		if (updates.language !== undefined) {
			this._profile = this._profile.withLanguage(updates.language);
		}
		if (updates.address !== undefined) {
			this._address = updates.address;
		}
		this._updatedAt = new Date();
	}

	recoverPassword(token?: string): void {
		this._recoverPasswordRequest = RecoverPassword.recordNow(token);
		this._updatedAt = new Date();
	}

	updatePassword(encodedPassword: string): void {
		this._password = encodedPassword;
		this._recoverPasswordRequest = null;
		this._updatedAt = new Date();
	}
}
