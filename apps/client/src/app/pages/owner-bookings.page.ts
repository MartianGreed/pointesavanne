import { Component, inject, signal } from "@angular/core"
import { BookingService, euros, frenchDate, type BookingRow } from "../core/booking.service"

/** The villa owner's review screen: every booking, validate signed quotations. */
@Component({
  selector: "app-owner-bookings",
  imports: [],
  template: `
    <main class="page">
      <h1>Réservations</h1>
      @if (bookings().length === 0) {
        <p>Aucune réservation.</p>
      } @else {
        <table>
          <thead>
            <tr><th>Client</th><th>Séjour</th><th>Statut</th><th>Total</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (b of bookings(); track b.bookingId) {
              <tr>
                <td>{{ b.customerId }}</td>
                <td>
                  {{ frenchDate(b.from) }} → {{ frenchDate(b.to) }}
                  <small>({{ b.nights }} nuits)</small>
                </td>
                <td>{{ b.status }}</td>
                <td>{{ euros(b.totalAmount) }}</td>
                <td>
                  @if (b.status === "quotation-signed") {
                    <button type="button" (click)="validate(b, true)">Valider</button>
                    <button type="button" class="danger" (click)="validate(b, false, 'Documents incomplets')">Refuser</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </main>
  `,
  styles: `
    .page { max-width: 60rem; margin: 3rem auto; padding: 0 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    button { padding: 0.4rem 0.8rem; margin-right: 0.4rem; }
    .danger { color: #b3261e; }
  `,
})
export class OwnerBookingsPage {
  readonly #bookings = inject(BookingService)
  readonly bookings = signal<BookingRow[]>([])
  readonly euros = euros
  readonly frenchDate = frenchDate

  constructor() {
    void this.load()
  }

  async load(): Promise<void> {
    try {
      const { items } = await this.#bookings.allBookings()
      this.bookings.set(items)
    } catch {
      this.bookings.set([])
    }
  }

  async validate(booking: BookingRow, accepted: boolean, reason?: string): Promise<void> {
    await this.#bookings.validateQuotation(booking.bookingId, accepted, reason)
    await this.load()
  }
}
