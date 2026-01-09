import { BookingId } from './booking-id.ts'
import { Villa } from './villa.ts'
import { Status } from './status.ts'
import { Transition } from './transition.ts'
import { FormattedBookingDates } from './formatted-booking-dates.ts'
import { PricingContext } from './pricing-context.ts'
import { Price } from './pricing/price.ts'
import { InvalidBookingEndDateException } from './exception/invalid-booking-end-date.ts'
import { DateUtils } from '../shared/date-utils.ts'
import { File } from '../shared/pdf/file.ts'
import type { Customer } from '../customer/customer.ts'

export class Booking {
  private pricingContext!: PricingContext
  private status: Status
  private createdAt: Date
  private updatedAt: Date | null = null
  private transitions: Transition[] = []
  private files: File[] = []

  private constructor(
    private readonly bookingId: BookingId,
    private readonly villa: Villa,
    private readonly customer: Customer,
    private readonly from: Date,
    private readonly to: Date,
    private readonly adultsCount: number,
    private readonly childrenCount: number
  ) {
    this.status = Status.QUOTATION_REQUESTED
    this.createdAt = new Date()
  }

  static request(
    bookingId: BookingId,
    villa: Villa,
    customer: Customer,
    from: Date,
    to: Date,
    adultsCount: number,
    childrenCount: number = 0
  ): Booking {
    if (DateUtils.isBefore(to, from)) {
      throw new InvalidBookingEndDateException(DateUtils.formatDate(from), DateUtils.formatDate(to))
    }

    return new Booking(bookingId, villa, customer, from, to, adultsCount, childrenCount)
  }

  createPricingContext(): void {
    this.pricingContext = PricingContext.create(this.villa, this.from, this.to)
  }

  awaitQuotationAcceptance(file: File): void {
    this.files.push(file)
    this.transitionTo(Status.QUOTATION_AWAITING_ACCEPTATION)
  }

  signQuotation(signedQuotation: File): void {
    this.files.push(signedQuotation)
    this.transitionTo(Status.QUOTATION_SIGNED)
  }

  transitionTo(status: Status): this {
    this.transitions.push(new Transition(this.status, status, DateUtils.getDate()))
    this.status = status
    this.updatedAt = DateUtils.getDate()

    return this
  }

  getId(): string {
    return this.bookingId.toString()
  }

  getVilla(): Villa {
    return this.villa
  }

  getCustomer(): Customer {
    return this.customer
  }

  getPricingContext(): PricingContext {
    return this.pricingContext
  }

  getFrom(): Date {
    return this.from
  }

  getTo(): Date {
    return this.to
  }

  getFormattedBookingDates(): FormattedBookingDates {
    return new FormattedBookingDates(DateUtils.formatDate(this.from), DateUtils.formatDate(this.to))
  }

  getUnrankedTouristTax(): Price {
    return this.pricingContext.getUnrankedTouristTax(
      this.from,
      this.to,
      this.adultsCount + this.childrenCount,
      this.adultsCount
    )
  }

  getRankedTouristTax(): Price {
    return this.pricingContext.getRankedTouristTax(this.from, this.to, this.adultsCount)
  }

  getAdultsCount(): number {
    return this.adultsCount
  }

  getChildrenCount(): number {
    return this.childrenCount
  }

  getStatus(): Status {
    return this.status
  }

  getFiles(): File[] {
    return this.files
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date | null {
    return this.updatedAt
  }

  getTransitions(): Transition[] {
    return this.transitions
  }
}
