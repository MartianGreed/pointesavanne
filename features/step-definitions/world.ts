import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber'
import { InMemoryCustomerRepository } from '../../ts/infrastructure/testing/in-memory-customer-repository.ts'
import { InMemoryBookingRepository } from '../../ts/infrastructure/testing/in-memory-booking-repository.ts'
import { InMemoryAuthenticationGateway } from '../../ts/infrastructure/testing/in-memory-authentication-gateway.ts'
import { InMemoryMailer } from '../../ts/infrastructure/testing/in-memory-mailer.ts'
import { InMemoryMessageQueue } from '../../ts/infrastructure/testing/in-memory-message-queue.ts'
import { InMemoryQuotationNumericIdGenerator } from '../../ts/infrastructure/testing/in-memory-quotation-numeric-id-generator.ts'
import { BunPasswordEncoder } from '../../ts/infrastructure/password/bun-password-encoder.ts'
import { InMemoryPDFGenerator } from './support/in-memory-pdf-generator.ts'
import { InMemoryFileLocator } from './support/in-memory-file-locator.ts'
import { RegistrationUseCase } from '../../ts/domain/customer/register/registration-use-case.ts'
import { LoginUseCase } from '../../ts/domain/customer/login/login-use-case.ts'
import { SaveProfileUseCase } from '../../ts/domain/customer/save-profile/save-profile-use-case.ts'
import { RecoverPasswordUseCase } from '../../ts/domain/customer/recover-password/recover-password-use-case.ts'
import { UpdatePasswordUseCase } from '../../ts/domain/customer/update-password/update-password-use-case.ts'
import { QuotationUseCase } from '../../ts/domain/booking/quotation/quotation-use-case.ts'
import { QuotationGenerationUseCase } from '../../ts/domain/booking/quotation-generation/quotation-generation-use-case.ts'
import { QuotationSignedUseCase } from '../../ts/domain/booking/quotation-signed/quotation-signed-use-case.ts'
import { CustomerUseCaseManager } from '../../ts/infrastructure/testing/customer-use-case-manager.ts'
import { BookingUseCaseManager } from '../../ts/infrastructure/testing/booking-use-case-manager.ts'
import { PriceParser } from '../../ts/domain/booking/pricing/price-parser.ts'
import { Villa } from '../../ts/domain/booking/villa.ts'
import { Discount } from '../../ts/domain/booking/discount/discount.ts'
import { PriceRange } from '../../ts/domain/booking/pricing/price-range.ts'
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
import type { QuotationGenerationResponse } from '../../ts/domain/booking/quotation-generation/quotation-generation-response.ts'
import type { QuotationSignedResponse } from '../../ts/domain/booking/quotation-signed/quotation-signed-response.ts'
import type { Customer } from '../../ts/domain/customer/customer.ts'
import type { Booking } from '../../ts/domain/booking/booking.ts'

const ADMIN_EMAIL = 'admin@pointesavanne.com'
const OWNER_EMAIL = 'owner@pointesavanne.com'

export class TestWorld extends World {
  public customerRepository: InMemoryCustomerRepository
  public bookingRepository: InMemoryBookingRepository
  public authenticationGateway: InMemoryAuthenticationGateway
  public mailer: InMemoryMailer
  public asyncMessage: InMemoryMessageQueue
  public quotationNumericIdGenerator: InMemoryQuotationNumericIdGenerator
  public passwordEncoder: BunPasswordEncoder
  public pdfGenerator: InMemoryPDFGenerator
  public fileLocator: InMemoryFileLocator
  public priceParser: PriceParser

  public registrationUseCase: RegistrationUseCase
  public loginUseCase: LoginUseCase
  public saveProfileUseCase: SaveProfileUseCase
  public recoverPasswordUseCase: RecoverPasswordUseCase
  public updatePasswordUseCase: UpdatePasswordUseCase
  public quotationUseCase: QuotationUseCase
  public quotationGenerationUseCase: QuotationGenerationUseCase
  public quotationSignedUseCase: QuotationSignedUseCase

  public customerUseCaseManager: CustomerUseCaseManager
  public bookingUseCaseManager: BookingUseCaseManager

  public villa!: Villa
  public discount!: Discount
  public priceRange!: PriceRange

  public registrationRequest: RegistrationRequest | null = null
  public registrationResponse: RegistrationResponse | null = null
  public loginRequest: LoginRequest | null = null
  public loginResponse: LoginResponse | null = null
  public saveProfileRequest: SaveProfileRequest | null = null
  public saveProfileResponse: SaveProfileResponse | null = null
  public recoverPasswordRequest: RecoverPasswordRequest | null = null
  public recoverPasswordResponse: RecoverPasswordResponse | null = null
  public updatePasswordRequest: UpdatePasswordRequest | null = null
  public updatePasswordResponse: UpdatePasswordResponse | null = null
  public quotationRequest: QuotationRequest | null = null
  public quotationResponse: QuotationResponse | null = null
  public quotationGenerationResponse: QuotationGenerationResponse | null = null
  public quotationSignedResponse: QuotationSignedResponse | null = null

  public customer: Customer | null = null
  public booking: Booking | null = null
  public backgroundBooking: Booking | null = null
  public sessionId: string | null = null
  public requestException: Error | null = null
  public executeException: Error | null = null

  constructor(options: IWorldOptions) {
    super(options)

    this.customerRepository = new InMemoryCustomerRepository()
    this.bookingRepository = new InMemoryBookingRepository()
    this.authenticationGateway = new InMemoryAuthenticationGateway()
    this.mailer = new InMemoryMailer(ADMIN_EMAIL)
    this.asyncMessage = new InMemoryMessageQueue()
    this.quotationNumericIdGenerator = new InMemoryQuotationNumericIdGenerator()
    this.passwordEncoder = new BunPasswordEncoder()
    this.pdfGenerator = new InMemoryPDFGenerator()
    this.fileLocator = new InMemoryFileLocator()
    this.priceParser = new PriceParser()

    this.registrationUseCase = new RegistrationUseCase(
      this.passwordEncoder,
      this.customerRepository,
      this.mailer
    )

    this.loginUseCase = new LoginUseCase(
      this.customerRepository,
      this.passwordEncoder,
      this.authenticationGateway
    )

    this.saveProfileUseCase = new SaveProfileUseCase(this.customerRepository)

    this.recoverPasswordUseCase = new RecoverPasswordUseCase(this.customerRepository, this.mailer)

    this.updatePasswordUseCase = new UpdatePasswordUseCase(
      this.customerRepository,
      this.authenticationGateway,
      this.passwordEncoder
    )

    this.quotationUseCase = new QuotationUseCase(
      this.bookingRepository,
      this.authenticationGateway,
      this.mailer,
      this.asyncMessage,
      ADMIN_EMAIL
    )

    this.quotationGenerationUseCase = new QuotationGenerationUseCase(
      this.bookingRepository,
      this.pdfGenerator,
      this.quotationNumericIdGenerator,
      this.mailer
    )

    this.quotationSignedUseCase = new QuotationSignedUseCase(
      this.bookingRepository,
      this.fileLocator,
      this.mailer,
      OWNER_EMAIL
    )

    this.customerUseCaseManager = new CustomerUseCaseManager(
      this.registrationUseCase,
      this.saveProfileUseCase
    )

    this.bookingUseCaseManager = new BookingUseCaseManager(
      this.quotationUseCase,
      this.quotationGenerationUseCase
    )
  }
}

setWorldConstructor(TestWorld)
