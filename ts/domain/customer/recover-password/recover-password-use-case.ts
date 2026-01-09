import type { CustomerRepository } from '../customer-repository.ts'
import type { Mailer } from '../../shared/mailer.ts'
import { CustomerNotFoundException } from '../exception/customer-not-found.ts'
import { RecoverPasswordMail } from './recover-password-mail.ts'
import { RecoverPasswordRequest } from './recover-password-request.ts'
import { RecoverPasswordResponse } from './recover-password-response.ts'

export class RecoverPasswordUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly mailer: Mailer
  ) {}

  async execute(request: RecoverPasswordRequest): Promise<RecoverPasswordResponse> {
    const customer = await this.customerRepository.findCustomerByEmail(request.identifier)
    if (customer === null) {
      throw new CustomerNotFoundException(request.identifier.getValue())
    }

    customer.recoverPassword()
    await this.customerRepository.saveCustomer(customer)

    const recoverRequest = customer.getRecoverPasswordRequest()

    this.mailer.addMessage(
      RecoverPasswordMail.new([customer.getEmail()], {
        token: recoverRequest?.getToken(),
        requested_at: recoverRequest?.getRequestedAt().toLocaleString('fr-FR'),
        expire_at: recoverRequest?.getExpireAt().toLocaleString('fr-FR'),
        firstname: customer.getProfile().getFirstname(),
        lastname: customer.getProfile().getLastname()
      })
    )

    return new RecoverPasswordResponse('An email has been sent, please check your inbox.')
  }
}
