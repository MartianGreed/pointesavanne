import type { PDFGenerator } from '../../domain/shared/pdf/pdf-generator.ts'
import type { FileLocator } from '../../domain/shared/file-locator.ts'
import { File } from '../../domain/shared/pdf/file.ts'

export class BunPdfGenerator implements PDFGenerator {
  constructor(
    private readonly templateEngine: TemplateEngine,
    private readonly fileLocator: FileLocator
  ) {}

  async generate(template: string, filename: string): Promise<File> {
    const html = await this.templateEngine.render(template)
    const pdfContent = await this.generatePdfFromHtml(html)

    await this.fileLocator.save(filename, pdfContent)

    return new File(filename, pdfContent, 'application/pdf')
  }

  private async generatePdfFromHtml(html: string): Promise<Uint8Array> {
    return new TextEncoder().encode(html)
  }
}

export interface TemplateEngine {
  render(template: string, data?: Record<string, unknown>): Promise<string>
}
