import type { PDFGenerator } from '../../../ts/domain/shared/pdf/pdf-generator.ts'
import { File } from '../../../ts/domain/shared/pdf/file.ts'

export class InMemoryPDFGenerator implements PDFGenerator {
  private generatedFiles: Map<string, File> = new Map()

  async generate(html: string, filename: string): Promise<File> {
    const encoder = new TextEncoder()
    const content = encoder.encode(html)
    const file = new File(filename, content, 'application/pdf')
    this.generatedFiles.set(filename, file)
    return file
  }

  getGeneratedFile(location: string): File | undefined {
    return this.generatedFiles.get(location)
  }

  hasGeneratedFile(location: string): boolean {
    return this.generatedFiles.has(location)
  }

  clear(): void {
    this.generatedFiles.clear()
  }
}
