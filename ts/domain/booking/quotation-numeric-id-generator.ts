export interface QuotationNumericIdGenerator {
  generateQuotationId(): Promise<number>
}
