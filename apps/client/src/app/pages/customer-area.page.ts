import { Component, computed, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"
import { ProfileService, type Profile } from "../core/profile.service"
import { BookingService, euros, frenchDate, type BookingRow } from "../core/booking.service"

const STATUS_LABELS: Record<string, string> = {
  "quotation-requested": "Demande envoyée",
  "quotation-awaiting-acceptation": "Devis disponible",
  "quotation-signed": "Devis signé",
  "contract-sent": "Contrat envoyé",
}

@Component({
  selector: "app-customer-area",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="header">
        <h1>Mon espace client</h1>
        <button type="button" (click)="signOut()">Se déconnecter</button>
      </header>

      <section class="card">
        <h2>Mon profil</h2>
        @if (profileError()) {
          <p class="error">{{ profileError() }}</p>
        }
        @if (profileSaved()) {
          <p class="ok">Profil enregistré.</p>
        }
        @if (profile(); as p) {
          <form (ngSubmit)="saveProfile()">
            <div class="row">
              <label>Prénom <input name="firstname" [(ngModel)]="p.firstname" /></label>
              <label>Nom <input name="lastname" [(ngModel)]="p.lastname" /></label>
            </div>
            <div class="row">
              <label>E-mail <input name="email" [(ngModel)]="p.email" type="email" /></label>
              <label>Téléphone <input name="phone" [(ngModel)]="p.phoneNumber" /></label>
            </div>
            <div class="row">
              <label>Adresse <input name="line1" [(ngModel)]="p.line1" placeholder="25 place Grégoire Bordillon" /></label>
            </div>
            <div class="row">
              <label>Complément <input name="line2" [(ngModel)]="p.line2" /></label>
              <label>Code postal / ville <input name="line3" [(ngModel)]="p.line3" placeholder="49100 Angers" /></label>
            </div>
            <div class="row">
              <label>
                Langue préférée
                <select name="language" [(ngModel)]="p.language">
                  <option value="fr_FR">Français</option>
                  <option value="en_GB">English</option>
                </select>
              </label>
            </div>
            <button type="submit" [disabled]="profileBusy()">Enregistrer mon profil</button>
          </form>
        } @else {
          <p>Créez votre profil pour faciliter vos réservations.</p>
          <button type="button" (click)="createProfile()">Créer mon profil</button>
        }
      </section>

      <section class="card">
        <h2>Mes demandes</h2>
        <p><a routerLink="/devis">Nouvelle demande de devis</a></p>
        @if (bookings().length === 0) {
          <p>Aucune demande pour le moment.</p>
        } @else {
          <table>
            <thead>
              <tr><th>Séjour</th><th>Statut</th><th>Total</th><th>Devis signé</th></tr>
            </thead>
            <tbody>
              @for (b of bookings(); track b.bookingId) {
                <tr>
                  <td>
                    {{ frenchDate(b.from) }} → {{ frenchDate(b.to) }}
                    <small>({{ b.nights }} nuits, {{ b.adultsCount }} adulte(s), {{ b.childrenCount }} enfant(s))</small>
                  </td>
                  <td>{{ statusLabel(b.status) }}</td>
                  <td>{{ euros(b.totalAmount) }}</td>
                  <td>
                    @if (b.status === "quotation-awaiting-acceptation") {
                      <input type="file" (change)="upload(b, $event)" accept="application/pdf,image/*" />
                    } @else if (b.signedFileName) {
                      ✓ {{ b.signedFileName }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
  styles: `
    .page { max-width: 50rem; margin: 3rem auto; padding: 0 1rem; display: grid; gap: 1.5rem; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .card { border: 1px solid #ddd; border-radius: 0.75rem; padding: 1.25rem; }
    .row { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
    label { display: block; margin-bottom: 0.75rem; }
    input, select { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .error { color: #b3261e; }
    .ok { color: #0d5c4d; }
  `,
})
export class CustomerAreaPage {
  readonly #auth = inject(Auth)
  readonly #profiles = inject(ProfileService)
  readonly #bookings = inject(BookingService)
  readonly #router = inject(Router)

  readonly profile = signal<Profile | null>(null)
  readonly bookings = signal<BookingRow[]>([])
  readonly profileBusy = signal(false)
  readonly profileSaved = signal(false)
  readonly profileError = signal("")

  readonly statusLabel = (status: string): string => STATUS_LABELS[status] ?? status
  readonly euros = euros
  readonly frenchDate = frenchDate

  constructor() {
    void this.load()
  }

  async load(): Promise<void> {
    try {
      const { profile } = await this.#profiles.get()
      this.profile.set(profile)
    } catch {
      this.profile.set(null)
    }
    try {
      const { items } = await this.#bookings.myBookings()
      this.bookings.set(items)
    } catch {
      this.bookings.set([])
    }
  }

  createProfile(): void {
    const email = this.#auth.user()?.email ?? ""
    this.profile.set({
      customerId: "",
      email,
      firstname: "",
      lastname: "",
      phoneNumber: "",
    })
  }

  async saveProfile(): Promise<void> {
    const p = this.profile()
    if (p === null) return
    this.profileBusy.set(true)
    this.profileError.set("")
    this.profileSaved.set(false)
    try {
      const saved = await this.#profiles.save({
        email: p.email,
        firstname: p.firstname,
        lastname: p.lastname,
        phoneNumber: p.phoneNumber,
        ...(p.language !== undefined ? { language: p.language } : {}),
        ...(p.line1 !== undefined && p.line1 !== "" ? { line1: p.line1 } : {}),
        ...(p.line2 !== undefined && p.line2 !== "" ? { line2: p.line2 } : {}),
        ...(p.line3 !== undefined && p.line3 !== "" ? { line3: p.line3 } : {}),
      })
      this.profile.set({ ...saved, customerId: saved.customerId })
      this.profileSaved.set(true)
    } catch (e) {
      const problem = e as { problem?: { issues?: string[] } }
      this.profileError.set(problem.problem?.issues?.[0] ?? "Enregistrement impossible.")
    } finally {
      this.profileBusy.set(false)
    }
  }

  async upload(booking: BookingRow, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file === undefined) return
    try {
      await this.#bookings.uploadSignedQuotation(booking.bookingId, file)
      await this.load()
    } catch {
      this.profileError.set("Téléversement impossible.")
    }
  }

  async signOut(): Promise<void> {
    await this.#auth.signOut()
    await this.#router.navigate(["/"])
  }
}
