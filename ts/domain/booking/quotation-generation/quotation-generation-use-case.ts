import type { BookingRepository } from '../booking-repository.ts'
import type { PDFGenerator } from '../../shared/pdf/pdf-generator.ts'
import type { QuotationNumericIdGenerator } from '../quotation-numeric-id-generator.ts'
import type { Mailer } from '../../shared/mailer.ts'
import { BookingNotFoundException } from '../exception/booking-not-found.ts'
import { QuotationDTO } from '../quotation/quotation-dto.ts'
import { QuotationPDF } from './quotation-pdf.ts'
import { QuotationHasBeenGenerated } from './quotation-has-been-generated.ts'
import { QuotationGenerationRequest } from './quotation-generation-request.ts'
import { QuotationGenerationResponse } from './quotation-generation-response.ts'

export class QuotationGenerationUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly pdfGenerator: PDFGenerator,
    private readonly quotationNumericIdGenerator: QuotationNumericIdGenerator,
    private readonly mailer: Mailer
  ) {}

  async execute(request: QuotationGenerationRequest): Promise<QuotationGenerationResponse> {
    const booking = await this.bookingRepository.findBookingById(request.bookingId)
    if (booking === null) {
      throw new BookingNotFoundException(request.bookingId.toString())
    }

    const numericId = await this.quotationNumericIdGenerator.generateQuotationId()
    const quotationPdf = QuotationPDF.generate(booking.getId(), QuotationDTO.fromBooking(booking, numericId))

    const file = await this.pdfGenerator.generate(quotationPdf.template, quotationPdf.location)

    booking.awaitQuotationAcceptance(file)

    await this.bookingRepository.save(booking)
    this.mailer.addMessage(
      QuotationHasBeenGenerated.new(booking.getCustomer().getEmail(), {
        location: file.name
      })
    )

    await this.mailer.send()

    return new QuotationGenerationResponse(booking, file)
  }
}
