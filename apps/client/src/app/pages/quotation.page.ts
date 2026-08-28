import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { BookingService, VILLA_ID, euros, frenchDate } from "../core/booking.service"

@Component({
  selector: "app-quotation",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <h1>Demande de devis</h1>
      @if (result(); as r) {
        <section class="card ok">
          <h2>Votre demande est enregistrée</h2>
          <p>Séjour du {{ frenchDate(r.from) }} au {{ frenchDate(r.to) }} — {{ r.nights }} nuits.</p>
          <ul>
            <li>Total séjour : {{ euros(r.total) }}</li>
            <li>Taxe touristique (non classé) : {{ euros(r.unranked) }}</li>
            <li>Taxe touristique (classé 4 étoiles) : {{ euros(r.ranked) }}</li>
            <li>Caution : {{ euros(r.deposit) }}</li>
            <li>Ménage obligatoire : {{ euros(r.household) }}</li>
          </ul>
          <p>Votre devis sera disponible dans <a routerLink="/espace-client">votre espace client</a>.</p>
        </section>
      } @else {
        @if (error()) {
          <p class="error">{{ error() }}</p>
        } @else if (availability() === false) {
          <p class="error">Ces dates ne sont pas disponibles. Choisissez une autre période.</p>
        }
        <form #f="ngForm" (ngSubmit)="submit()">
          <label>
            Arrivée
            <input type="date" name="from" [(ngModel)]="from" required (ngModelChange)="checkAvailability()" />
          </label>
          <label>
            Départ
            <input type="date" name="to" [(ngModel)]="to" required (ngModelChange)="checkAvailability()" />
          </label>
          <label>
            Adultes
            <input type="number" name="adults" [(ngModel)]="adults" required min="1" max="8" />
          </label>
          <label>
            Enfants
            <input type="number" name="children" [(ngModel)]="children" required min="0" max="8" />
          </label>
          <button type="submit" [disabled]="f.invalid || busy() || availability() === false">
            Envoyer ma demande
          </button>
        </form>
      }
    </main>
  `,
  styles: `
    .page { max-width: 32rem; margin: 3rem auto; padding: 0 1rem; }
    label { display: block; margin-bottom: 1rem; }
    input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    button { padding: 0.6rem 1.4rem; }
    .error { color: #b3261e; }
    .card { border: 1px solid #ddd; border-radius: 0.75rem; padding: 1.25rem; }
    .ok { border-color: #0d5c4d; }
  `,
})
export class QuotationPage {
  readonly #bookings = inject(BookingService)
  readonly #router = inject(Router)

  from = ""
  to = ""
  adults = 2
  children = 0

  readonly busy = signal(false)
  readonly error = signal("")
  readonly availability = signal<boolean | undefined>(undefined)
  readonly result = signal<{ from: string; to: string; nights: number; total: number; unranked: number; ranked: number; deposit: number; household: number } | null>(null)

  readonly euros = euros
  readonly frenchDate = frenchDate

  async checkAvailability(): Promise<void> {
    this.availability.set(undefined)
    if (this.from === "" || this.to === "" || this.from >= this.to) return
    try {
      const { available } = await this.#bookings.checkAvailability(VILLA_ID, this.from, this.to)
      this.availability.set(available)
    } catch {
      this.availability.set(undefined)
    }
  }

  async submit(): Promise<void> {
    this.busy.set(true)
    this.error.set("")
    try {
      const r = await this.#bookings.requestQuotation({
        villaId: VILLA_ID,
        from: this.from,
        to: this.to,
        adultsCount: this.adults,
        childrenCount: this.children,
      })
      this.result.set({
        from: this.from,
        to: this.to,
        nights: Math.round((new Date(this.to).getTime() - new Date(this.from).getTime()) / 86_400_000),
        total: r.pricing["totalAmount"] ?? 0,
        unranked: r.pricing["unrankedTouristTax"] ?? 0,
        ranked: r.pricing["rankedTouristTax"] ?? 0,
        deposit: r.pricing["depositAmount"] ?? 0,
        household: r.pricing["householdAmount"] ?? 0,
      })
    } catch (e) {
      const problem = e as { problem?: { issues?: string[] } }
      this.error.set(problem.problem?.issues?.[0] ?? "Demande impossible.")
    } finally {
      this.busy.set(false)
    }
  }
}
