import type { QuotationDTO, QuotationArray } from '../quotation/quotation-dto.ts'

export class QuotationPDF {
  constructor(
    public readonly template: string,
    public readonly location: string,
    public readonly data: QuotationArray
  ) {}

  static generate(bookingId: string, quotation: QuotationDTO): QuotationPDF {
    return new QuotationPDF('pdf/quotation', `booking/${bookingId}/devis.pdf`, quotation.toArray())
  }
}
