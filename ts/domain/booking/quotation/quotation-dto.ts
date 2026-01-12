import type { Booking } from '../booking.ts'
import type { Price } from '../pricing/price.ts'
import type { PricingContext } from '../pricing-context.ts'
import type { Customer } from '../../customer/customer.ts'
import type { Address } from '../../customer/address.ts'
import { AddressCannotBeNullException } from '../../customer/exception/address-cannot-be-null.ts'
import { DateUtils } from '../../shared/date-utils.ts'

export interface QuotationArray {
  numeric_id: number
  address: {
    name: string
    line1: string
    line2: string | null
    line3: string | null
    phone: string
    email: string
  }
  pricing: {
    nightsIn: number
    household_tax: Price
    total_amount: Price
    tourist_tax: Price
  }
  from: string
  to: string
  total_occupants: number
  adults_count: number
  children_count: number
  created_at: string
}

export class QuotationDTO {
  private constructor(
    private readonly numericId: number,
    private readonly customer: Customer,
    private readonly address: Address,
    private readonly pricingContext: PricingContext,
    private readonly household: Price,
    private readonly from: string,
    private readonly to: string,
    private readonly adultsCount: number,
    private readonly childrenCount: number,
    private readonly createdAt: string
  ) {}

  static fromBooking(booking: Booking, numericId: number): QuotationDTO {
    const customer = booking.getCustomer()
    const dates = booking.getFormattedBookingDates()
    const address = customer.getAddress()
    if (address === null) {
      throw new AddressCannotBeNullException()
    }

    return new QuotationDTO(
      numericId,
      customer,
      address,
      booking.getPricingContext(),
      booking.getVilla().getHouseholdAmount(),
      dates.from,
      dates.to,
      booking.getAdultsCount(),
      booking.getChildrenCount(),
      DateUtils.formatDate(DateUtils.getDate())
    )
  }

  toArray(): QuotationArray {
    return {
      numeric_id: this.numericId,
      address: {
        name: `${this.customer.getProfile().getFirstname()} ${this.customer.getProfile().getLastname()}`,
        line1: this.address.getLine1(),
        line2: this.address.getLine2(),
        line3: this.address.getLine3(),
        phone: this.customer.getProfile().getPhoneNumber(),
        email: this.customer.getEmail()
      },
      pricing: {
        nightsIn: this.getNightsInCount(),
        household_tax: this.household,
        total_amount: this.pricingContext.getTotalAmount(),
        tourist_tax: this.pricingContext.getUnrankedTouristTax(
          DateUtils.getDate(this.from),
          DateUtils.getDate(this.to),
          this.getTotalOccupants(),
          this.adultsCount
        )
      },
      from: this.from,
      to: this.to,
      total_occupants: this.adultsCount + this.childrenCount,
      adults_count: this.adultsCount,
      children_count: this.childrenCount,
      created_at: this.createdAt
    }
  }

  private getTotalOccupants(): number {
    return this.adultsCount + this.childrenCount
  }

  private getNightsInCount(): number {
    return DateUtils.daysBetween(DateUtils.getDate(this.from), DateUtils.getDate(this.to))
  }
}
