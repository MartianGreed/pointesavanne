import type { BookingRepository } from '../booking-repository.ts'
import type { FileLocator } from '../../shared/file-locator.ts'
import type { Mailer } from '../../shared/mailer.ts'
import { BookingNotFoundException } from '../exception/booking-not-found.ts'
import { QuotationSigned } from './quotation-signed.ts'
import { QuotationSignedRequest } from './quotation-signed-request.ts'
import { QuotationSignedResponse } from './quotation-signed-response.ts'
import { File } from '../../shared/pdf/file.ts'

export class QuotationSignedUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly locator: FileLocator,
    private readonly mailer: Mailer,
    private readonly ownerEmail: string
  ) {}

  async execute(request: QuotationSignedRequest): Promise<QuotationSignedResponse> {
    const booking = await this.bookingRepository.findBookingById(request.bookingId)
    if (booking === null) {
      throw new BookingNotFoundException(request.bookingId.toString())
    }

    const signedQuotationPath = await this.locator.locate(request.file.name)
    const signedQuotation = new File(signedQuotationPath, request.file.content, request.file.mimeType)

    booking.signQuotation(signedQuotation)

    await this.bookingRepository.save(booking)

    const dates = booking.getFormattedBookingDates()
    this.mailer.addMessage(
      QuotationSigned.new(this.ownerEmail, dates.from, dates.to, booking.getCustomer().getProfile().getFullname())
    )
    await this.mailer.send()

    return new QuotationSignedResponse(booking, signedQuotation)
  }
}
