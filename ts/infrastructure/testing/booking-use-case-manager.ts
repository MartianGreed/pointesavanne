import { QuotationUseCase } from '../../domain/booking/quotation/quotation-use-case.ts'
import { QuotationGenerationUseCase } from '../../domain/booking/quotation-generation/quotation-generation-use-case.ts'
import type { QuotationRequest } from '../../domain/booking/quotation/quotation-request.ts'
import type { QuotationResponse } from '../../domain/booking/quotation/quotation-response.ts'
import type { QuotationGenerationRequest } from '../../domain/booking/quotation-generation/quotation-generation-request.ts'
import type { QuotationGenerationResponse } from '../../domain/booking/quotation-generation/quotation-generation-response.ts'

export class BookingUseCaseManager {
  constructor(
    private readonly quotationUseCase: QuotationUseCase,
    private readonly generationUseCase: QuotationGenerationUseCase
  ) {}

  async requestQuotation(request: QuotationRequest): Promise<QuotationResponse> {
    return this.quotationUseCase.execute(request)
  }

  async generateQuotation(request: QuotationGenerationRequest): Promise<QuotationGenerationResponse> {
    return this.generationUseCase.execute(request)
  }
}
