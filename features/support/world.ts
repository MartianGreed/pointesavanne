import { setWorldConstructor, World } from '@cucumber/cucumber'
import type { IWorldOptions } from '@cucumber/cucumber'
import { InMemoryCustomerRepository } from '../../ts/infrastructure/testing/in-memory-customer-repository.ts'
import { InMemoryBookingRepository } from '../../ts/infrastructure/testing/in-memory-booking-repository.ts'
import { InMemoryAuthenticationGateway } from '../../ts/infrastructure/testing/in-memory-authentication-gateway.ts'
import { InMemoryMailer } from '../../ts/infrastructure/testing/in-memory-mailer.ts'
import { InMemoryMessageQueue } from '../../ts/infrastructure/testing/in-memory-message-queue.ts'
import { InMemoryQuotationNumericIdGenerator } from '../../ts/infrastructure/testing/in-memory-quotation-numeric-id-generator.ts'
import { NodePasswordEncoder } from '../../ts/infrastructure/testing/node-password-encoder.ts'
import { FileNotFoundException } from '../../ts/domain/shared/exception/file-not-found.ts'
import { RegistrationUseCase } from '../../ts/domain/customer/register/registration-use-case.ts'
import { LoginUseCase } from '../../ts/domain/customer/login/login-use-case.ts'
import { SaveProfileUseCase } from '../../ts/domain/customer/save-profile/save-profile-use-case.ts'
import { RecoverPasswordUseCase } from '../../ts/domain/customer/recover-password/recover-password-use-case.ts'
import { UpdatePasswordUseCase } from '../../ts/domain/customer/update-password/update-password-use-case.ts'
import { QuotationUseCase } from '../../ts/domain/booking/quotation/quotation-use-case.ts'
import { QuotationGenerationUseCase } from '../../ts/domain/booking/quotation-generation/quotation-generation-use-case.ts'
import { QuotationSignedUseCase } from '../../ts/domain/booking/quotation-signed/quotation-signed-use-case.ts'
import type { RegistrationRequest } from '../../ts/domain/customer/register/registration-request.ts'
import type { RegistrationResponse } from '../../ts/domain/customer/register/registration-response.ts'
import type { LoginRequest } from '../../ts/domain/customer/login/login-request.ts'
import type { LoginResponse } from '../../ts/domain/customer/login/login-response.ts'
import type { SaveProfileRequest } from '../../ts/domain/customer/save-profile/save-profile-request.ts'
import type { SaveProfileResponse } from '../../ts/domain/customer/save-profile/save-profile-response.ts'
import type { RecoverPasswordRequest } from '../../ts/domain/customer/recover-password/recover-password-request.ts'
import type { RecoverPasswordResponse } from '../../ts/domain/customer/recover-password/recover-password-response.ts'
import type { UpdatePasswordRequest } from '../../ts/domain/customer/update-password/update-password-request.ts'
import type { UpdatePasswordResponse } from '../../ts/domain/customer/update-password/update-password-response.ts'
import type { QuotationRequest } from '../../ts/domain/booking/quotation/quotation-request.ts'
import type { QuotationResponse } from '../../ts/domain/booking/quotation/quotation-response.ts'
import type { QuotationGenerationRequest } from '../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import type { QuotationGenerationResponse } from '../../ts/domain/booking/quotation-generation/quotation-generation-response.ts'
import type { QuotationSignedRequest } from '../../ts/domain/booking/quotation-signed/quotation-signed-request.ts'
import type { QuotationSignedResponse } from '../../ts/domain/booking/quotation-signed/quotation-signed-response.ts'
import type { Villa } from '../../ts/domain/booking/villa.ts'
import type { Message } from '../../ts/domain/shared/message.ts'

class InMemoryPDFGenerator {
  private generatedFiles: Map<string, string> = new Map()

  async generate(template: string, location: string) {
    this.generatedFiles.set(location, template)
    return { name: location, content: Buffer.from(''), mimeType: 'application/pdf' }
  }

  hasGenerated(location: string): boolean {
    return this.generatedFiles.has(location)
  }
}

class InMemoryFileLocator {
  private files: Map<string, boolean> = new Map()

  async locate(filename: string): Promise<string> {
    if (!this.files.has(filename)) {
      throw new FileNotFoundException(filename)
    }
    return filename
  }

  addFile(filename: string): void {
    this.files.set(filename, true)
  }
}

export class TestWorld extends World {
  customerRepository: InMemoryCustomerRepository
  bookingRepository: InMemoryBookingRepository
  authenticationGateway: InMemoryAuthenticationGateway
  mailer: InMemoryMailer
  messageQueue: InMemoryMessageQueue
  quotationNumericIdGenerator: InMemoryQuotationNumericIdGenerator
  encoder: NodePasswordEncoder
  pdfGenerator: InMemoryPDFGenerator
  fileLocator: InMemoryFileLocator

  registrationUseCase: RegistrationUseCase
  loginUseCase: LoginUseCase
  saveProfileUseCase: SaveProfileUseCase
  recoverPasswordUseCase: RecoverPasswordUseCase
  updatePasswordUseCase: UpdatePasswordUseCase
  quotationUseCase: QuotationUseCase
  quotationGenerationUseCase: QuotationGenerationUseCase
  quotationSignedUseCase: QuotationSignedUseCase

  registrationRequest: RegistrationRequest | null = null
  registrationResponse: RegistrationResponse | null = null
  loginRequest: LoginRequest | null = null
  loginResponse: LoginResponse | null = null
  saveProfileRequest: SaveProfileRequest | null = null
  saveProfileResponse: SaveProfileResponse | null = null
  recoverPasswordRequest: RecoverPasswordRequest | null = null
  recoverPasswordResponse: RecoverPasswordResponse | null = null
  updatePasswordRequest: UpdatePasswordRequest | null = null
  updatePasswordResponse: UpdatePasswordResponse | null = null
  quotationRequest: QuotationRequest | null = null
  quotationResponse: QuotationResponse | null = null
  quotationGenerationRequest: QuotationGenerationRequest | null = null
  quotationGenerationResponse: QuotationGenerationResponse | null = null
  quotationSignedRequest: QuotationSignedRequest | null = null
  quotationSignedResponse: QuotationSignedResponse | null = null

  villa: Villa | null = null
  requestException: Error | null = null
  executeException: Error | null = null

  constructor(options: IWorldOptions) {
    super(options)

    this.customerRepository = new InMemoryCustomerRepository()
    this.bookingRepository = new InMemoryBookingRepository()
    this.authenticationGateway = new InMemoryAuthenticationGateway()
    this.mailer = new InMemoryMailer('admin@villa-pointe-savanne.com')
    this.messageQueue = new InMemoryMessageQueue()
    this.quotationNumericIdGenerator = new InMemoryQuotationNumericIdGenerator()
    this.encoder = new NodePasswordEncoder()
    this.pdfGenerator = new InMemoryPDFGenerator()
    this.fileLocator = new InMemoryFileLocator()

    this.registrationUseCase = new RegistrationUseCase(
      this.encoder,
      this.customerRepository,
      this.mailer
    )

    this.loginUseCase = new LoginUseCase(
      this.customerRepository,
      this.encoder,
      this.authenticationGateway
    )

    this.saveProfileUseCase = new SaveProfileUseCase(this.customerRepository)

    this.recoverPasswordUseCase = new RecoverPasswordUseCase(
      this.customerRepository,
      this.mailer
    )

    this.updatePasswordUseCase = new UpdatePasswordUseCase(
      this.customerRepository,
      this.authenticationGateway,
      this.encoder
    )

    this.quotationUseCase = new QuotationUseCase(
      this.bookingRepository,
      this.authenticationGateway,
      this.mailer,
      this.messageQueue,
      'admin@villa-pointe-savanne.com'
    )

    this.quotationGenerationUseCase = new QuotationGenerationUseCase(
      this.bookingRepository,
      this.pdfGenerator as any,
      this.quotationNumericIdGenerator,
      this.mailer
    )

    this.quotationSignedUseCase = new QuotationSignedUseCase(
      this.bookingRepository,
      this.fileLocator as any,
      this.mailer,
      'admin@villa-pointe-savanne.com'
    )
  }

  getDispatchedMessages(): Message[] {
    return this.messageQueue.getDispatchedMessages()
  }

  getSentEmails() {
    return this.mailer.getSent()
  }

  addUploadedFile(filename: string): void {
    this.fileLocator.addFile(filename)
  }

  hasGeneratedPDF(location: string): boolean {
    return this.pdfGenerator.hasGenerated(location)
  }
}

setWorldConstructor(TestWorld)
