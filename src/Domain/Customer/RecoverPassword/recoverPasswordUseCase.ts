import type { Mailer } from "../../Shared/mail";
import type { CustomerRepository } from "../customerRepository";
import { Email } from "../email";
import type { RecoverPasswordRequest } from "./recoverPasswordRequest";
import { RecoverPasswordResponse } from "./recoverPasswordResponse";

export class RecoverPasswordUseCase {
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly mailer: Mailer,
	) {}

	async execute(
		request: RecoverPasswordRequest,
	): Promise<RecoverPasswordResponse> {
		try {
			const email = Email.create(request.email);
			const customer = await this.customerRepository.findCustomerByEmail(email);

			if (!customer) {
				return RecoverPasswordResponse.success();
			}

			customer.recoverPassword();
			await this.customerRepository.saveCustomer(customer);

			const token = customer.recoverPasswordRequest?.token;
			this.mailer.addMessage({
				to: request.email,
				subject: "Password Recovery",
				body: `Click here to reset your password: /reset-password?token=${token}`,
			});
			await this.mailer.send();

			return RecoverPasswordResponse.success();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Password recovery failed";
			return RecoverPasswordResponse.failure([message]);
		}
	}
}
