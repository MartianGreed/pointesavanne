export interface Price {
  amount: number
  currency: string
  formatted: string
}

export interface Villa {
  name: string
  caution: Price
  household: Price
}

export interface QuotationRequest {
  villa: string
  from: string
  to: string
  adultsCount: number
  childrenCount: number
  customer: CustomerProfile
}

export interface QuotationPricing {
  nightsIn: number
  householdTax: Price
  totalAmount: Price
  touristTax: Price
  discount?: number
}

export interface Quotation {
  id: string
  numericId: number
  from: string
  to: string
  adultsCount: number
  childrenCount: number
  pricing: QuotationPricing
  status: BookingStatus
  createdAt: string
}

export type BookingStatus =
  | 'quotation-requested'
  | 'quotation-awaiting-acceptation'
  | 'quotation-signed'

export interface BookingDates {
  from: Date
  to: Date
}

export interface AvailabilityResponse {
  available: boolean
  bookedDates: string[]
}

export interface PriceRange {
  from: string
  to: string
  weeklyPrice: Price
}

export interface SeasonalPricing {
  ranges: PriceRange[]
}

export interface CustomerAddress {
  name: string
  line1: string
  line2?: string
  line3?: string
  phone: string
  email: string
}

export interface CustomerProfileAddress {
  line1?: string
  line2?: string
  line3?: string
}

export interface CustomerProfile {
  firstName: string
  lastName: string
  phone: string
  email: string
  address?: CustomerProfileAddress
}
