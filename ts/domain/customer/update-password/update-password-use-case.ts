import type { CustomerRepository } from '../customer-repository.ts'
import type { AuthenticationGateway } from '../authentication-gateway.ts'
import type { PasswordEncoder } from '../password-encoder.ts'
import { UpdatePasswordRequest } from './update-password-request.ts'
import { UpdatePasswordResponse } from './update-password-response.ts'

export class UpdatePasswordUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly authenticationGateway: AuthenticationGateway,
    private readonly encoder: PasswordEncoder
  ) {}

  async execute(request: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
    const strategy = request.getStrategy(this.customerRepository, this.authenticationGateway, this.encoder)

    const customer = await strategy.updateFromRequest(request)

    return new UpdatePasswordResponse('Password successfully updated', customer)
  }
}
