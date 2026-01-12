import type { AsyncMessage } from '../../shared/async-message.ts'
import type { Mailer } from '../../shared/mailer.ts'
import type { BookingRepository } from '../booking-repository.ts'
import type { AuthenticationGateway } from '../../customer/authentication-gateway.ts'
import { Booking } from '../booking.ts'
import { BookingId } from '../booking-id.ts'
import { BookingUnavailableException } from '../exception/booking-unavailable.ts'
import { BookingHasBeenRequested } from '../message/booking-has-been-requested.ts'
import { NewQuotationRequest } from './new-quotation-request.ts'
import { QuotationRequestHasBeenSent } from './quotation-request-has-been-sent.ts'
import { QuotationRequest } from './quotation-request.ts'
import { QuotationResponse } from './quotation-response.ts'

export class QuotationUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly authenticationGateway: AuthenticationGateway,
    private readonly mailer: Mailer,
    private readonly asyncMessage: AsyncMessage,
    private readonly adminMail: string
  ) {}

  async execute(request: QuotationRequest): Promise<QuotationResponse> {
    const customer = await this.authenticationGateway.getCurrentLoggedInCustomer()

    const booking = Booking.request(
      BookingId.build(),
      request.villa,
      customer,
      request.from,
      request.to,
      request.adultsCount,
      request.childrenCount
    )
    const bookingDates = booking.getFormattedBookingDates()

    if (!(await this.bookingRepository.isBookingAvailable(bookingDates))) {
      throw new BookingUnavailableException(bookingDates)
    }

    booking.createPricingContext()

    await this.bookingRepository.save(booking)

    const params = {
      bookingId: booking.getId(),
      from: bookingDates.from,
      to: bookingDates.to
    }

    this.mailer.addMessage(NewQuotationRequest.new(this.adminMail, params))
    this.mailer.addMessage(QuotationRequestHasBeenSent.new(customer.getEmail(), params))

    this.asyncMessage.dispatch(new BookingHasBeenRequested(booking.getId(), bookingDates.from, bookingDates.to))
    await this.mailer.send()

    return new QuotationResponse(booking)
  }
}
