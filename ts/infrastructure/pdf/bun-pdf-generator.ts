import type { PDFGenerator } from '../../domain/shared/pdf/pdf-generator.ts'
import { File } from '../../domain/shared/pdf/file.ts'
import { LocalFileLocator } from '../file/local-file-locator.ts'

export class BunPdfGenerator implements PDFGenerator {
  constructor(
    private readonly templateEngine: TemplateEngine,
    private readonly fileLocator: LocalFileLocator
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
