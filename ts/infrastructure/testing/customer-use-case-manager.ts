import { RegistrationUseCase } from '../../domain/customer/register/registration-use-case.ts'
import { SaveProfileUseCase } from '../../domain/customer/save-profile/save-profile-use-case.ts'
import type { RegistrationRequest } from '../../domain/customer/register/registration-request.ts'
import type { RegistrationResponse } from '../../domain/customer/register/registration-response.ts'
import type { SaveProfileRequest } from '../../domain/customer/save-profile/save-profile-request.ts'
import type { SaveProfileResponse } from '../../domain/customer/save-profile/save-profile-response.ts'

export class CustomerUseCaseManager {
  constructor(
    private readonly registrationUseCase: RegistrationUseCase,
    private readonly saveProfileUseCase: SaveProfileUseCase
  ) {}

  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    return this.registrationUseCase.execute(request)
  }

  async saveProfile(request: SaveProfileRequest): Promise<SaveProfileResponse> {
    return this.saveProfileUseCase.execute(request)
  }
}
