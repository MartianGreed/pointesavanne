import type { File } from './file.ts'

export interface PDFGenerator {
  generate(html: string, filename: string): Promise<File>
}
