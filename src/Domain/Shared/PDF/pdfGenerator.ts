import type { File } from "../file";
import type { PdfContent } from "./pdfContent";

export interface PdfGenerator {
	generate(content: PdfContent): Promise<File>;
}
