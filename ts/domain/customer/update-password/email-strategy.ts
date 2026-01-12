import type { CustomerRepository } from '../customer-repository.ts'
import type { AuthenticationGateway } from '../authentication-gateway.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import type { PasswordUpdater, UpdatePasswordRequestData } from './password-updater.ts'
import type { Customer } from '../customer.ts'
import { CustomerNotFoundException } from '../exception/customer-not-found.ts'
import { InvalidCredentialsException } from '../exception/invalid-credentials.ts'
import { ForbiddenException } from '../../shared/exception/forbidden.ts'

export class EmailStrategy implements PasswordUpdater {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly authenticationGateway: AuthenticationGateway,
    private readonly encoder: PasswordEncoder
  ) {}

  async updateFromRequest(request: UpdatePasswordRequestData): Promise<Customer> {
    if (request.email === null) {
      throw new Error('Email cannot be null')
    }

    const customer = await this.customerRepository.findCustomerByEmail(request.email)
    if (customer === null) {
      throw new CustomerNotFoundException(request.email.getValue())
    }

    const passwordValid = await this.encoder.check(customer.getPassword() ?? '', request.oldPassword ?? '')
    if (!passwordValid) {
      throw new InvalidCredentialsException()
    }

    const currentLoggedInCustomer = await this.authenticationGateway.getCurrentLoggedInCustomer()
    if (customer.getEmail() !== currentLoggedInCustomer.getEmail()) {
      throw new ForbiddenException('Cannot update other customers password.')
    }

    const encoded = await this.encoder.encode(request.newPassword ?? '')
    return customer.updatePassword(encoded)
  }
}
