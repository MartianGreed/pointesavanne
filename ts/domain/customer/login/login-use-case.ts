import type { CustomerRepository } from '../customer-repository.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import type { AuthenticationGateway } from '../authentication-gateway.ts'
import { CustomerNotFoundException } from '../exception/customer-not-found.ts'
import { LoginRequest } from './login-request.ts'
import { LoginResponse } from './login-response.ts'

export class LoginUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly encoder: PasswordEncoder,
    private readonly authenticationGateway: AuthenticationGateway
  ) {}

  async execute(login: LoginRequest): Promise<LoginResponse> {
    const customer = await this.customerRepository.findCustomerByEmail(login.email)
    if (customer === null) {
      throw new CustomerNotFoundException(login.email.getValue())
    }

    const passwordValid = await this.encoder.check(customer.getPassword() ?? '', login.plainPassword)
    if (!passwordValid) {
      return new LoginResponse(null, ['Invalid credentials'])
    }

    await this.customerRepository.saveCustomer(customer.logIn())

    const sessionId = await this.authenticationGateway.logCustomerIn(customer)

    return new LoginResponse(sessionId)
  }
}
