import type { FileLocator } from "../../Shared/file";
import type { Mailer } from "../../Shared/mail";
import type { BookingRepository } from "../bookingRepository";
import type { QuotationSignedRequest } from "./quotationSignedRequest";
import { QuotationSignedResponse } from "./quotationSignedResponse";

export class QuotationSignedUseCase {
	constructor(
		private readonly bookingRepository: BookingRepository,
		private readonly fileLocator: FileLocator,
		private readonly mailer: Mailer,
		private readonly ownerEmail: string,
	) {}

	async execute(
		request: QuotationSignedRequest,
	): Promise<QuotationSignedResponse> {
		try {
			const booking = await this.bookingRepository.findBookingById(
				request.bookingId,
			);

			if (!booking) {
				return QuotationSignedResponse.failure(["Booking not found"]);
			}

			const signedFile = await this.fileLocator.locate(
				request.signedQuotationFilePath,
			);

			booking.markAsSigned();
			booking.addFile(signedFile);
			await this.bookingRepository.save(booking);

			this.mailer.addMessage({
				to: this.ownerEmail,
				subject: "Quotation Signed",
				body: `The quotation for ${booking.villa.name} has been signed by ${booking.customer.profile.getFullName()}.`,
			});
			await this.mailer.send();

			return QuotationSignedResponse.success();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Quotation signing failed";
			return QuotationSignedResponse.failure([message]);
		}
	}
}
