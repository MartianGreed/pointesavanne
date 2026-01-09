export class Profile {
	constructor(
		readonly firstname: string,
		readonly lastname: string,
		readonly phoneNumber: string,
		readonly language: string = "fr",
	) {
		if (!Profile.isValidPhoneNumber(phoneNumber)) {
			throw new Error(`Invalid phone number: ${phoneNumber}`);
		}
	}

	static isValidPhoneNumber(phoneNumber: string): boolean {
		const phoneRegex = /^(?:\+33|0)[1-9](?:[0-9]{2}){4}$/;
		return phoneRegex.test(phoneNumber.replace(/\s/g, ""));
	}

	static create(
		firstname: string,
		lastname: string,
		phoneNumber: string,
		language?: string,
	): Profile {
		return new Profile(firstname, lastname, phoneNumber, language ?? "fr");
	}

	withFirstname(firstname: string): Profile {
		return new Profile(
			firstname,
			this.lastname,
			this.phoneNumber,
			this.language,
		);
	}

	withLastname(lastname: string): Profile {
		return new Profile(
			this.firstname,
			lastname,
			this.phoneNumber,
			this.language,
		);
	}

	withPhoneNumber(phoneNumber: string): Profile {
		return new Profile(
			this.firstname,
			this.lastname,
			phoneNumber,
			this.language,
		);
	}

	withLanguage(language: string): Profile {
		return new Profile(
			this.firstname,
			this.lastname,
			this.phoneNumber,
			language,
		);
	}

	getFullName(): string {
		return `${this.firstname} ${this.lastname}`;
	}
}
