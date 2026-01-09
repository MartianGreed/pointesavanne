export class QuotationSignedResponse {
	private constructor(
		readonly success: boolean,
		readonly errors: string[],
	) {}

	static success(): QuotationSignedResponse {
		return new QuotationSignedResponse(true, []);
	}

	static failure(errors: string[]): QuotationSignedResponse {
		return new QuotationSignedResponse(false, errors);
	}
}
