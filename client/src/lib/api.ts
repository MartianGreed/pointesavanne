const API_BASE = '/api'

export interface QuotationRequest {
  villaId: string
  from: string
  to: string
  adultsCount: number
  childrenCount: number
}

export interface QuotationResponse {
  bookingId: string
  pricing: {
    nightsIn: number
    totalAmount: string
    householdTax: string
    touristTax: string
    discount?: string
  }
  from: string
  to: string
  adultsCount: number
  childrenCount: number
}

export interface Booking {
  id: string
  status: 'quotation-requested' | 'quotation-awaiting-acceptation' | 'quotation-signed'
  from: string
  to: string
  adultsCount: number
  childrenCount: number
  pricing: {
    nightsIn: number
    totalAmount: string
    householdTax: string
    touristTax: string
  }
  createdAt: string
}

export interface AvailableDates {
  unavailablePeriods: Array<{
    from: string
    to: string
  }>
  pricingRanges: Array<{
    from: string
    to: string
    pricePerWeek: string
  }>
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message)
  }
  return response.json()
}

export const api = {
  async getAvailableDates(): Promise<AvailableDates> {
    const response = await fetch(`${API_BASE}/villa/availability`)
    return handleResponse<AvailableDates>(response)
  },

  async requestQuotation(data: QuotationRequest): Promise<QuotationResponse> {
    const response = await fetch(`${API_BASE}/quotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<QuotationResponse>(response)
  },

  async getBooking(bookingId: string): Promise<Booking> {
    const response = await fetch(`${API_BASE}/bookings/${bookingId}`)
    return handleResponse<Booking>(response)
  },

  async getMyBookings(): Promise<Booking[]> {
    const response = await fetch(`${API_BASE}/bookings`)
    return handleResponse<Booking[]>(response)
  },

  async uploadSignedQuotation(bookingId: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('signedQuotation', file)

    const response = await fetch(`${API_BASE}/bookings/${bookingId}/sign`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<void>(response)
  },
}
