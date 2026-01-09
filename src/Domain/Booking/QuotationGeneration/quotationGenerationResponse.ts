import type { File } from "../../Shared/file";

export class QuotationGenerationResponse {
	private constructor(
		readonly success: boolean,
		readonly file: File | null,
		readonly errors: string[],
	) {}

	static success(file: File): QuotationGenerationResponse {
		return new QuotationGenerationResponse(true, file, []);
	}

	static failure(errors: string[]): QuotationGenerationResponse {
		return new QuotationGenerationResponse(false, null, errors);
	}
}
