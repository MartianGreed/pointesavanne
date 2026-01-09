import type { CustomerRepository } from '../customer-repository.ts'
import { Address } from '../address.ts'
import { CustomerNotFoundException } from '../exception/customer-not-found.ts'
import { SaveProfileRequest } from './save-profile-request.ts'
import { SaveProfileResponse } from './save-profile-response.ts'

export class SaveProfileUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(request: SaveProfileRequest): Promise<SaveProfileResponse> {
    const customer = await this.customerRepository.findCustomerByEmail(request.email)
    if (customer === null) {
      throw new CustomerNotFoundException(request.email.getValue())
    }

    let address: Address | null = null
    if (request.line1 !== null && request.line3 !== null) {
      address = new Address(request.line1, request.line3, request.line2)
    }

    const updatedCustomer = customer.updateProfile(
      address,
      request.firstname,
      request.lastname,
      request.phoneNumber,
      request.language
    )
    await this.customerRepository.saveCustomer(updatedCustomer)

    return new SaveProfileResponse(updatedCustomer)
  }
}
