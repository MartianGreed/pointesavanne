import type { Mailer } from "../../Shared/mail";
import { Customer } from "../customer";
import type { CustomerRepository } from "../customerRepository";
import type { PasswordEncoder } from "../passwordEncoder";
import type { RegistrationRequest } from "./registrationRequest";
import { RegistrationResponse } from "./registrationResponse";

export class RegistrationUseCase {
	constructor(
		private readonly passwordEncoder: PasswordEncoder,
		private readonly customerRepository: CustomerRepository,
		private readonly mailer: Mailer,
	) {}

	async execute(request: RegistrationRequest): Promise<RegistrationResponse> {
		try {
			const encodedPassword = await this.passwordEncoder.encode(
				request.password,
			);

			const exists = await this.customerRepository.doesCustomerWithEmailExists(
				request.email,
			);
			if (exists) {
				return RegistrationResponse.failure([
					"A customer with this email already exists",
				]);
			}

			const customer = Customer.register(
				request.email,
				encodedPassword,
				request.phoneNumber,
				request.firstname,
				request.lastname,
			);

			await this.customerRepository.saveCustomer(customer);

			this.mailer.addMessage({
				to: request.email,
				subject: "Welcome to Villa Booking",
				body: `Hello ${request.firstname}, welcome to our service!`,
			});
			await this.mailer.send();

			return RegistrationResponse.success();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Registration failed";
			return RegistrationResponse.failure([message]);
		}
	}
}
