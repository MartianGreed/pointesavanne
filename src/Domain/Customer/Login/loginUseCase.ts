import type { AuthenticationGateway } from "../authenticationGateway";
import type { CustomerRepository } from "../customerRepository";
import { Email } from "../email";
import type { PasswordEncoder } from "../passwordEncoder";
import type { LoginRequest } from "./loginRequest";
import { LoginResponse } from "./loginResponse";

export class LoginUseCase {
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly passwordEncoder: PasswordEncoder,
		private readonly authenticationGateway: AuthenticationGateway,
	) {}

	async execute(request: LoginRequest): Promise<LoginResponse> {
		try {
			const email = Email.create(request.email);
			const customer = await this.customerRepository.findCustomerByEmail(email);

			if (!customer) {
				return LoginResponse.failure(["Invalid credentials"]);
			}

			const isPasswordValid = await this.passwordEncoder.check(
				customer.password,
				request.plainPassword,
			);

			if (!isPasswordValid) {
				return LoginResponse.failure(["Invalid credentials"]);
			}

			customer.logIn();
			await this.customerRepository.saveCustomer(customer);

			const sessionId =
				await this.authenticationGateway.logCustomerIn(customer);

			return LoginResponse.success(sessionId);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Login failed";
			return LoginResponse.failure([message]);
		}
	}
}
