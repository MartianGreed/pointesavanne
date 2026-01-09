import { Customer } from '../customer.ts'
import { CustomerId } from '../customer-id.ts'
import type { CustomerRepository } from '../customer-repository.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import { CustomerAlreadyExistException } from '../exception/customer-already-exists.ts'
import type { Mailer } from '../../shared/mailer.ts'
import { RegistrationRequest } from './registration-request.ts'
import { RegistrationResponse } from './registration-response.ts'
import { RegisterMail } from './register-mail.ts'

export class RegistrationUseCase {
  constructor(
    private readonly encoder: PasswordEncoder,
    private readonly customerRepository: CustomerRepository,
    private readonly mailer: Mailer
  ) {}

  async execute(request: RegistrationRequest): Promise<RegistrationResponse> {
    const encodedPassword = await this.encoder.encode(request.password)

    if (await this.customerRepository.doesCustomerWithEmailExists(request.email.getValue())) {
      const exception = new CustomerAlreadyExistException(request.email.getValue())
      return new RegistrationResponse(null, [exception.message])
    }

    const customer = Customer.register(
      CustomerId.build(),
      request.email,
      encodedPassword,
      request.phoneNumber,
      request.firstname,
      request.lastname
    )

    await this.customerRepository.saveCustomer(customer)
    this.mailer.addMessage(RegisterMail.new([customer.getEmail()], {}))
    await this.mailer.send()

    return new RegistrationResponse(customer)
  }
}
