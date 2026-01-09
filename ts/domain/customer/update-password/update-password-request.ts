import type { CustomerRepository } from '../customer-repository.ts'
import type { AuthenticationGateway } from '../authentication-gateway.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import type { Email } from '../email.ts'
import type { PasswordUpdater, UpdatePasswordRequestData } from './password-updater.ts'
import { InvalidUpdatePasswordRequestException } from '../exception/invalid-update-password-request.ts'
import { NoUpdatePasswordStrategyFound } from '../exception/no-update-password-strategy-found.ts'
import { EmailStrategy } from './email-strategy.ts'
import { TokenStrategy } from './token-strategy.ts'

export class UpdatePasswordRequest implements UpdatePasswordRequestData {
  constructor(
    public readonly email: Email | null = null,
    public readonly oldPassword: string | null = null,
    public readonly newPassword: string | null = null,
    public readonly token: string | null = null
  ) {
    if (
      (this.email === null && this.oldPassword === null && this.token === null) ||
      (this.email === null && this.token === null) ||
      (this.token === null && this.newPassword === null)
    ) {
      throw new InvalidUpdatePasswordRequestException()
    }
  }

  getStrategy(
    customerRepository: CustomerRepository,
    authenticationGateway: AuthenticationGateway,
    encoder: PasswordEncoder
  ): PasswordUpdater {
    if (this.email !== null && this.newPassword !== null && this.oldPassword !== null) {
      return new EmailStrategy(customerRepository, authenticationGateway, encoder)
    }

    if (this.token !== null && this.newPassword !== null) {
      return new TokenStrategy(customerRepository, authenticationGateway, encoder)
    }

    throw new NoUpdatePasswordStrategyFound()
  }
}
