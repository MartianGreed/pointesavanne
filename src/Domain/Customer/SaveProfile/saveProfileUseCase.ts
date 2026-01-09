import { Address } from "../address";
import type { CustomerRepository } from "../customerRepository";
import { Email } from "../email";
import type { SaveProfileRequest } from "./saveProfileRequest";
import { SaveProfileResponse } from "./saveProfileResponse";

export class SaveProfileUseCase {
	constructor(private readonly customerRepository: CustomerRepository) {}

	async execute(request: SaveProfileRequest): Promise<SaveProfileResponse> {
		try {
			const email = Email.create(request.email);
			const customer = await this.customerRepository.findCustomerByEmail(email);

			if (!customer) {
				return SaveProfileResponse.failure(["Customer not found"]);
			}

			let address: Address | null | undefined;
			if (request.addressLine1) {
				address = Address.create(
					request.addressLine1,
					request.addressLine2,
					request.addressLine3,
				);
			}

			customer.updateProfile({
				firstname: request.firstname,
				lastname: request.lastname,
				phoneNumber: request.phoneNumber,
				language: request.language,
				address,
			});

			await this.customerRepository.saveCustomer(customer);

			return SaveProfileResponse.success();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Profile update failed";
			return SaveProfileResponse.failure([message]);
		}
	}
}
