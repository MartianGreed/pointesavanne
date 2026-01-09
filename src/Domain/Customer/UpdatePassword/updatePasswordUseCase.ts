import type { CustomerRepository } from "../customerRepository";
import type { PasswordEncoder } from "../passwordEncoder";
import type { UpdatePasswordRequest } from "./updatePasswordRequest";
import { UpdatePasswordResponse } from "./updatePasswordResponse";

export class UpdatePasswordUseCase {
	constructor(
		private readonly customerRepository: CustomerRepository,
		private readonly passwordEncoder: PasswordEncoder,
	) {}

	async execute(
		request: UpdatePasswordRequest,
	): Promise<UpdatePasswordResponse> {
		try {
			const customer = await this.customerRepository.findCustomerByResetToken(
				request.token,
			);

			if (!customer) {
				return UpdatePasswordResponse.failure(["Invalid or expired token"]);
			}

			if (customer.recoverPasswordRequest?.isExpired()) {
				return UpdatePasswordResponse.failure(["Token has expired"]);
			}

			const encodedPassword = await this.passwordEncoder.encode(
				request.newPassword,
			);
			customer.updatePassword(encodedPassword);
			await this.customerRepository.saveCustomer(customer);

			return UpdatePasswordResponse.success();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Password update failed";
			return UpdatePasswordResponse.failure([message]);
		}
	}
}
