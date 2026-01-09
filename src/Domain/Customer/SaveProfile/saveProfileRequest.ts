export class SaveProfileRequest {
	constructor(
		readonly email: string,
		readonly firstname?: string,
		readonly lastname?: string,
		readonly phoneNumber?: string,
		readonly language?: string,
		readonly addressLine1?: string,
		readonly addressLine2?: string,
		readonly addressLine3?: string,
	) {}
}
