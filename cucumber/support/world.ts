import { World, setWorldConstructor } from '@cucumber/cucumber'
import type { IWorldOptions } from '@cucumber/cucumber'
import { RegistrationUseCase } from '../../ts/domain/customer/register/registration-use-case.ts'
import { RegistrationRequest } from '../../ts/domain/customer/register/registration-request.ts'
import { RegistrationResponse } from '../../ts/domain/customer/register/registration-response.ts'
import { LoginUseCase } from '../../ts/domain/customer/login/login-use-case.ts'
import { LoginRequest } from '../../ts/domain/customer/login/login-request.ts'
import { LoginResponse } from '../../ts/domain/customer/login/login-response.ts'
import { SaveProfileUseCase } from '../../ts/domain/customer/save-profile/save-profile-use-case.ts'
import { SaveProfileRequest } from '../../ts/domain/customer/save-profile/save-profile-request.ts'
import { SaveProfileResponse } from '../../ts/domain/customer/save-profile/save-profile-response.ts'
import { RecoverPasswordUseCase } from '../../ts/domain/customer/recover-password/recover-password-use-case.ts'
import { RecoverPasswordRequest } from '../../ts/domain/customer/recover-password/recover-password-request.ts'
import { RecoverPasswordResponse } from '../../ts/domain/customer/recover-password/recover-password-response.ts'
import { UpdatePasswordUseCase } from '../../ts/domain/customer/update-password/update-password-use-case.ts'
import { UpdatePasswordRequest } from '../../ts/domain/customer/update-password/update-password-request.ts'
import { UpdatePasswordResponse } from '../../ts/domain/customer/update-password/update-password-response.ts'
import { QuotationUseCase } from '../../ts/domain/booking/quotation/quotation-use-case.ts'
import { QuotationRequest } from '../../ts/domain/booking/quotation/quotation-request.ts'
import { QuotationResponse } from '../../ts/domain/booking/quotation/quotation-response.ts'
import { QuotationGenerationUseCase } from '../../ts/domain/booking/quotation-generation/quotation-generation-use-case.ts'
import { QuotationGenerationRequest } from '../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import { QuotationGenerationResponse } from '../../ts/domain/booking/quotation-generation/quotation-generation-response.ts'
import { QuotationSignedUseCase } from '../../ts/domain/booking/quotation-signed/quotation-signed-use-case.ts'
import { QuotationSignedRequest } from '../../ts/domain/booking/quotation-signed/quotation-signed-request.ts'
import { QuotationSignedResponse } from '../../ts/domain/booking/quotation-signed/quotation-signed-response.ts'
import { Email } from '../../ts/domain/customer/email.ts'
import { Customer } from '../../ts/domain/customer/customer.ts'
import { Booking } from '../../ts/domain/booking/booking.ts'
import { BookingId } from '../../ts/domain/booking/booking-id.ts'
import { Villa } from '../../ts/domain/booking/villa.ts'
import { Discount } from '../../ts/domain/booking/discount/discount.ts'
import { Range as DiscountRange } from '../../ts/domain/booking/discount/range.ts'
import { DiscountAmount } from '../../ts/domain/booking/discount/discount-amount.ts'
import { PriceRange } from '../../ts/domain/booking/pricing/price-range.ts'
import { Range as PricingRange } from '../../ts/domain/booking/pricing/range.ts'
import { PriceParser } from '../../ts/domain/booking/pricing/price-parser.ts'
import { DateUtils } from '../../ts/domain/shared/date-utils.ts'
import { File } from '../../ts/domain/shared/pdf/file.ts'
import type { Message } from '../../ts/domain/shared/message.ts'
import { InMemoryCustomerRepository } from '../../ts/infrastructure/testing/in-memory-customer-repository.ts'
import { InMemoryBookingRepository } from '../../ts/infrastructure/testing/in-memory-booking-repository.ts'
import { InMemoryAuthenticationGateway } from '../../ts/infrastructure/testing/in-memory-authentication-gateway.ts'
import { InMemoryMailer } from '../../ts/infrastructure/testing/in-memory-mailer.ts'
import { InMemoryMessageQueue } from '../../ts/infrastructure/testing/in-memory-message-queue.ts'
import { InMemoryQuotationNumericIdGenerator } from '../../ts/infrastructure/testing/in-memory-quotation-numeric-id-generator.ts'
import { CustomerUseCaseManager } from '../../ts/infrastructure/testing/customer-use-case-manager.ts'
import { BookingUseCaseManager } from '../../ts/infrastructure/testing/booking-use-case-manager.ts'
import { InMemoryPasswordEncoder } from '../../ts/infrastructure/testing/in-memory-password-encoder.ts'
import { InMemoryFileLocator } from '../../ts/infrastructure/testing/in-memory-file-locator.ts'
import { BunPdfGenerator, type TemplateEngine } from '../../ts/infrastructure/pdf/bun-pdf-generator.ts'

class SimpleTemplateEngine implements TemplateEngine {
  async render(template: string, _data?: Record<string, unknown>): Promise<string> {
    return template
  }
}

export class TestWorld extends World {
  public customerRepository!: InMemoryCustomerRepository
  public bookingRepository!: InMemoryBookingRepository
  public authenticationGateway!: InMemoryAuthenticationGateway
  public mailer!: InMemoryMailer
  public messageQueue!: InMemoryMessageQueue
  public passwordEncoder!: InMemoryPasswordEncoder
  public fileLocator!: InMemoryFileLocator
  public pdfGenerator!: BunPdfGenerator
  public quotationIdGenerator!: InMemoryQuotationNumericIdGenerator
  public priceParser!: PriceParser

  public registrationUseCase!: RegistrationUseCase
  public loginUseCase!: LoginUseCase
  public saveProfileUseCase!: SaveProfileUseCase
  public recoverPasswordUseCase!: RecoverPasswordUseCase
  public updatePasswordUseCase!: UpdatePasswordUseCase
  public quotationUseCase!: QuotationUseCase
  public quotationGenerationUseCase!: QuotationGenerationUseCase
  public quotationSignedUseCase!: QuotationSignedUseCase

  public customerUseCaseManager!: CustomerUseCaseManager
  public bookingUseCaseManager!: BookingUseCaseManager

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
  public villa: Villa | null = null
  public discount: Discount | null = null
  public sessionId: string | null = null
  public runningMessage: Message | null = null
  public bookingId: string | null = null

  public requestException: Error | null = null
  public executeException: Error | null = null
  public loginRequestException: Error | null = null

  public valuesToUpdate: Record<string, string> = {}

  private readonly ADMIN_EMAIL = 'admin@villa-pointesavanne.com'
  private readonly OWNER_EMAIL = 'owner@villa-pointesavanne.com'

  constructor(options: IWorldOptions) {
    super(options)
    this.initializeInfrastructure()
    this.initializeUseCases()
    this.initializeManagers()
  }

  private initializeInfrastructure(): void {
    this.customerRepository = new InMemoryCustomerRepository()
    this.bookingRepository = new InMemoryBookingRepository()
    this.authenticationGateway = new InMemoryAuthenticationGateway()
    this.mailer = new InMemoryMailer(this.ADMIN_EMAIL)
    this.messageQueue = new InMemoryMessageQueue()
    this.passwordEncoder = new InMemoryPasswordEncoder()
    this.fileLocator = new InMemoryFileLocator()
    this.pdfGenerator = new BunPdfGenerator(new SimpleTemplateEngine(), this.fileLocator)
    this.quotationIdGenerator = new InMemoryQuotationNumericIdGenerator()
    this.priceParser = new PriceParser()
  }

  private initializeUseCases(): void {
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
      this.messageQueue,
      this.ADMIN_EMAIL
    )

    this.quotationGenerationUseCase = new QuotationGenerationUseCase(
      this.bookingRepository,
      this.pdfGenerator,
      this.quotationIdGenerator,
      this.mailer
    )

    this.quotationSignedUseCase = new QuotationSignedUseCase(
      this.bookingRepository,
      this.fileLocator,
      this.mailer,
      this.OWNER_EMAIL
    )
  }

  private initializeManagers(): void {
    this.customerUseCaseManager = new CustomerUseCaseManager(
      this.registrationUseCase,
      this.saveProfileUseCase
    )

    this.bookingUseCaseManager = new BookingUseCaseManager(
      this.quotationUseCase,
      this.quotationGenerationUseCase
    )
  }

  reset(): void {
    this.registrationRequest = null
    this.registrationResponse = null
    this.loginRequest = null
    this.loginResponse = null
    this.saveProfileRequest = null
    this.saveProfileResponse = null
    this.recoverPasswordRequest = null
    this.recoverPasswordResponse = null
    this.updatePasswordRequest = null
    this.updatePasswordResponse = null
    this.quotationRequest = null
    this.quotationResponse = null
    this.quotationGenerationResponse = null
    this.quotationSignedResponse = null
    this.customer = null
    this.booking = null
    this.backgroundBooking = null
    this.villa = null
    this.discount = null
    this.sessionId = null
    this.runningMessage = null
    this.bookingId = null
    this.requestException = null
    this.executeException = null
    this.loginRequestException = null
    this.valuesToUpdate = {}

    this.initializeInfrastructure()
    this.initializeUseCases()
    this.initializeManagers()
  }
}

setWorldConstructor(TestWorld)

export { Email, Customer, Villa, Booking, BookingId, Discount, DiscountRange, DiscountAmount, PriceRange, PricingRange, DateUtils, File }
export type { Message }
export { RegistrationRequest, RegistrationResponse, LoginRequest, LoginResponse }
export { SaveProfileRequest, SaveProfileResponse, RecoverPasswordRequest, RecoverPasswordResponse }
export { UpdatePasswordRequest, UpdatePasswordResponse, QuotationRequest, QuotationResponse }
export { QuotationGenerationRequest, QuotationGenerationResponse, QuotationSignedRequest, QuotationSignedResponse }
