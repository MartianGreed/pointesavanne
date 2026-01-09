import type { PdfContent } from "../../Domain/Shared/PDF/pdfContent";
import type { PdfGenerator } from "../../Domain/Shared/PDF/pdfGenerator";
import { File } from "../../Domain/Shared/file";

export class InMemoryPdfGenerator implements PdfGenerator {
	private generatedPdfs: Map<string, PdfContent> = new Map();

	async generate(content: PdfContent): Promise<File> {
		this.generatedPdfs.set(content.outputFileName, content);
		return new File(content.outputFileName);
	}

	getGeneratedPdfs(): Map<string, PdfContent> {
		return new Map(this.generatedPdfs);
	}

	clear(): void {
		this.generatedPdfs.clear();
	}
}
