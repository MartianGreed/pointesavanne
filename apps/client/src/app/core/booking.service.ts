import { Injectable, inject } from '@angular/core';
import { Api } from './api';

export interface LeadSubmission {
  readonly email: string;
  readonly firstname: string;
  readonly lastname: string;
  readonly phoneNumber: string;
  readonly villaId: string;
  readonly from: string;
  readonly to: string;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly message?: string;
}

export interface ClaimOutcome {
  readonly claimed: number;
  readonly bookings: ReadonlyArray<{
    bookingId: string;
    status: string;
    pricing: Record<string, number>;
  }>;
  readonly issues: readonly string[];
}

export interface BookingRow {
  readonly bookingId: string;
  readonly customerId: string;
  readonly status:
    'quotation-requested' | 'quotation-awaiting-acceptation' | 'quotation-signed' | 'contract-sent';
  readonly villaId: string;
  readonly villaName: string;
  readonly from: string;
  readonly to: string;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly nights: number;
  readonly totalAmount: number;
  readonly unrankedTouristTax: number;
  readonly rankedTouristTax: number;
  readonly depositAmount: number;
  readonly householdAmount: number;
  readonly pdfPath?: string;
  readonly signedFileName?: string;
}

export const VILLA_ID = 'villa-de-standing-pointe-savanne';

@Injectable({ providedIn: 'root' })
export class BookingService {
  readonly #api = inject(Api);

  requestQuotation(input: {
    villaId: string;
    from: string;
    to: string;
    adultsCount: number;
    childrenCount: number;
    message?: string;
  }): Promise<{ bookingId: string; status: string; pricing: Record<string, number> }> {
    return this.#api.post('/bookings/quotation', input);
  }

  /** The anonymous devis funnel: the backend keeps the intent as a lead. */
  submitLead(input: LeadSubmission): Promise<{ leadId: string; status: string }> {
    return this.#api.post('/bookings/leads', input);
  }

  /** Converts the signed-in customer's pending lead (e-mail derived server-side). */
  claimLeads(): Promise<ClaimOutcome> {
    return this.#api.post('/bookings/leads/claim', {});
  }

  myBookings(): Promise<{ items: BookingRow[] }> {
    return this.#api.get<{ items: BookingRow[] }>('/bookings/my');
  }

  allBookings(status?: string): Promise<{ items: BookingRow[] }> {
    const query = status === undefined ? '' : `?status=${encodeURIComponent(status)}`;
    return this.#api.get<{ items: BookingRow[] }>(`/bookings${query}`);
  }

  checkAvailability(villaId: string, from: string, to: string): Promise<{ available: boolean }> {
    return this.#api.get(
      `/bookings/availability?villaId=${encodeURIComponent(villaId)}&from=${from}&to=${to}`,
    );
  }

  async uploadSignedQuotation(
    bookingId: string,
    file: File,
  ): Promise<{ bookingId: string; status: string }> {
    const contentBase64 = await this.fileToBase64(file);
    return this.#api.post(`/bookings/${bookingId}/signed-document`, {
      fileName: file.name,
      contentBase64,
    });
  }

  validateQuotation(
    bookingId: string,
    accepted: boolean,
    reason?: string,
  ): Promise<{ bookingId: string; status: string }> {
    return this.#api.post(`/bookings/${bookingId}/validation`, { accepted, reason });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(new Error('lecture du fichier impossible'));
      reader.readAsDataURL(file);
    });
  }
}
