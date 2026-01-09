export class PdfContent {
	constructor(
		readonly baseFileName: string,
		readonly outputFileName: string,
		readonly data: Record<string, unknown>,
	) {}
}
