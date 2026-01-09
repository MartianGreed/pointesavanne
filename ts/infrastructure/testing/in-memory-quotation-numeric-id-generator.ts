import type { QuotationNumericIdGenerator } from '../../domain/booking/quotation-numeric-id-generator.ts'

export class InMemoryQuotationNumericIdGenerator implements QuotationNumericIdGenerator {
  private generatedQuotations = 0

  async generateQuotationId(): Promise<number> {
    return this.generatedQuotations + 1
  }
}
