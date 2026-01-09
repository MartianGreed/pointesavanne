import type { AuthenticationGateway } from "../../Customer/authenticationGateway";
import type { AsyncMessage } from "../../Shared/asyncMessage";
import type { Mailer } from "../../Shared/mail";
import { Booking } from "../booking";
import type { BookingRepository } from "../bookingRepository";
import { CustomerRef } from "../customerRef";
import { PricingContext } from "../pricingContext";
import { BookingHasBeenRequested } from "./bookingHasBeenRequested";
import type { QuotationRequest } from "./quotationRequest";
import { QuotationResponse } from "./quotationResponse";

export class QuotationUseCase {
	constructor(
		private readonly authenticationGateway: AuthenticationGateway,
		private readonly bookingRepository: BookingRepository,
		private readonly mailer: Mailer,
		private readonly asyncMessage: AsyncMessage,
	) {}

	async execute(request: QuotationRequest): Promise<QuotationResponse> {
		try {
			const customer =
				await this.authenticationGateway.getCurrentLoggedInCustomer();

			const pricingContext = PricingContext.create(
				request.villa,
				request.from,
				request.to,
				request.adultsCount,
			);

			const customerRef = CustomerRef.create(
				customer.id,
				customer.email,
				customer.profile,
			);

			const booking = Booking.request(
				request.villa,
				customerRef,
				request.from,
				request.to,
				request.adultsCount,
				request.childrenCount,
				pricingContext,
			);

			const isAvailable = await this.bookingRepository.isBookingAvailable(
				booking.getFormattedDates(),
			);

			if (!isAvailable) {
				return QuotationResponse.failure([
					"The selected dates are not available",
				]);
			}

			await this.bookingRepository.save(booking);

			await this.asyncMessage.dispatch(new BookingHasBeenRequested(booking.id));

			this.mailer.addMessage({
				to: customer.email.toString(),
				subject: "Quotation Request Received",
				body: `Your quotation request for ${request.villa.name} has been received.`,
			});
			await this.mailer.send();

			return QuotationResponse.success(booking);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Quotation request failed";
			return QuotationResponse.failure([message]);
		}
	}
}
