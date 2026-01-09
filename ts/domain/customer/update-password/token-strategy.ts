import type { CustomerRepository } from '../customer-repository.ts'
import type { AuthenticationGateway } from '../authentication-gateway.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import type { PasswordUpdater, UpdatePasswordRequestData } from './password-updater.ts'
import type { Customer } from '../customer.ts'
import { CustomerNotFoundException } from '../exception/customer-not-found.ts'

export class TokenStrategy implements PasswordUpdater {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly _authenticationGateway: AuthenticationGateway,
    private readonly encoder: PasswordEncoder
  ) {}

  async updateFromRequest(request: UpdatePasswordRequestData): Promise<Customer> {
    const customer = await this.customerRepository.findCustomerByResetToken(request.token ?? '')
    if (customer === null) {
      throw new CustomerNotFoundException(request.token ?? '')
    }

    const encoded = await this.encoder.encode(request.newPassword ?? '')
    return customer.updatePassword(encoded)
  }
}
