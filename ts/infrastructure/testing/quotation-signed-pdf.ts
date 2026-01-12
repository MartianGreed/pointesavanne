import type { QuotationDTO } from '../../domain/booking/quotation/quotation-dto.ts'

export class QuotationSignedPDF {
  private constructor(
    public readonly baseFileName: string,
    public readonly outputFileName: string,
    public readonly data: Record<string, unknown>
  ) {}

  static generate(bookingId: string, quotation: QuotationDTO): QuotationSignedPDF {
    return new QuotationSignedPDF(
      'pdf/quotation',
      `booking/${bookingId}/devis-signe.pdf`,
      quotation.toArray() as unknown as Record<string, unknown>
    )
  }
}
