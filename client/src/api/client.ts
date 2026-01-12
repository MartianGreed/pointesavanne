import type {
  QuotationRequest,
  Quotation,
  AvailabilityResponse,
  SeasonalPricing
} from '../types/booking'

const API_BASE = '/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export const api = {
  async checkAvailability(from: string, to: string): Promise<AvailabilityResponse> {
    const response = await fetch(`${API_BASE}/availability?from=${from}&to=${to}`)
    return handleResponse<AvailabilityResponse>(response)
  },

  async getSeasonalPricing(): Promise<SeasonalPricing> {
    const response = await fetch(`${API_BASE}/pricing`)
    return handleResponse<SeasonalPricing>(response)
  },

  async requestQuotation(request: QuotationRequest): Promise<Quotation> {
    const response = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse<Quotation>(response)
  },

  async getQuotation(id: string): Promise<Quotation> {
    const response = await fetch(`${API_BASE}/quotations/${id}`)
    return handleResponse<Quotation>(response)
  },

  async downloadQuotationPdf(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/quotations/${id}/pdf`)
    if (!response.ok) {
      throw new Error('Failed to download PDF')
    }
    return response.blob()
  },

  async uploadSignedQuotation(id: string, file: File): Promise<Quotation> {
    const formData = new FormData()
    formData.append('signedQuotation', file)

    const response = await fetch(`${API_BASE}/quotations/${id}/sign`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<Quotation>(response)
  },

  async getBookedDates(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/bookings/dates`)
    return handleResponse<string[]>(response)
  },
}
