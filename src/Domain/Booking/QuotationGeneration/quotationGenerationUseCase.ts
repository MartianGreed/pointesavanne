import { PdfContent } from "../../Shared/PDF/pdfContent";
import type { PdfGenerator } from "../../Shared/PDF/pdfGenerator";
import type { Mailer } from "../../Shared/mail";
import type { BookingRepository } from "../bookingRepository";
import type { QuotationGenerationRequest } from "./quotationGenerationRequest";
import { QuotationGenerationResponse } from "./quotationGenerationResponse";

export class QuotationGenerationUseCase {
	constructor(
		private readonly bookingRepository: BookingRepository,
		private readonly pdfGenerator: PdfGenerator,
		private readonly mailer: Mailer,
	) {}

	async execute(
		request: QuotationGenerationRequest,
	): Promise<QuotationGenerationResponse> {
		try {
			const booking = await this.bookingRepository.findBookingById(
				request.bookingId,
			);

			if (!booking) {
				return QuotationGenerationResponse.failure(["Booking not found"]);
			}

			const pdfContent = new PdfContent(
				"quotation",
				`quotation-${booking.id.toString()}.pdf`,
				{
					booking: {
						id: booking.id.toString(),
						villa: booking.villa.name,
						from: booking.from.toISOString(),
						to: booking.to.toISOString(),
						adultsCount: booking.adultsCount,
						childrenCount: booking.childrenCount,
						totalAmount: booking.pricingContext.getTotalAmount().toEuros(),
						customer: {
							name: booking.customer.profile.getFullName(),
							email: booking.customer.email.toString(),
						},
					},
				},
			);

			const file = await this.pdfGenerator.generate(pdfContent);

			booking.markAsAwaitingAcceptation();
			booking.addFile(file);
			await this.bookingRepository.save(booking);

			this.mailer.addMessage({
				to: booking.customer.email.toString(),
				subject: "Your Quotation is Ready",
				body: `Your quotation for ${booking.villa.name} is ready for review.`,
			});
			await this.mailer.send();

			return QuotationGenerationResponse.success(file);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Quotation generation failed";
			return QuotationGenerationResponse.failure([message]);
		}
	}
}
