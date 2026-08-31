import { Component, afterNextRender, computed, inject, signal } from "@angular/core"
import { ActivatedRoute, Router, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"
import { BookingService, VILLA_ID } from "../core/booking.service"
import { ProfileService } from "../core/profile.service"
import { fillContactGaps, fillStayGaps, nightsBetween, type ContactState } from "../core/form-state"
import { QuoteFunnelStore } from "../core/quote-funnel.store"
import { euros, estimateStay } from "../shared/estimate"

type Availability = "unknown" | "checking" | "available" | "unavailable" | "invalid"

interface QuotationResult {
  readonly nights: number
  readonly totalAmount: number
  readonly unrankedTouristTax: number
  readonly depositAmount: number
  readonly householdAmount: number
}

/**
 * The quotation request page: dates with live availability, contact details
 * pre-filled from the profile, and a sticky estimate that switches to the
 * API's exact pricing once the request is registered.
 */
@Component({
  selector: "app-quotation",
  imports: [RouterLink],
  template: `
    <section class="container intro">
      <div class="kicker">DISPONIBILITÉS &amp; DEVIS</div>
      <h1 class="title">Vérifiez les disponibilités et recevez votre devis</h1>
      <p class="text">
        Choisissez vos dates pour vérifier la disponibilité de la villa, puis complétez vos
        coordonnées : votre devis détaillé vous est envoyé par e-mail.
      </p>
    </section>

    <section class="container layout">
      <div class="column">
        <div class="card step-card">
          <h2 class="step-title">1. Vos dates</h2>
          <div class="dates-grid">
            <label class="field">
              <span class="field-label">Arrivée</span>
              <input type="date" [value]="arrivee()" (change)="onArrivee($event)" />
            </label>
            <label class="field">
              <span class="field-label">Départ</span>
              <input type="date" [value]="depart()" (change)="onDepart($event)" />
            </label>
            <label class="field">
              <span class="field-label">Voyageurs</span>
              <span class="select-wrap">
                <select [value]="voyageurs()" (change)="onVoyageurs($event)">
                  @for (n of [2, 3, 4, 5, 6, 7, 8]; track n) {
                    <option [value]="n">{{ n }} voyageurs</option>
                  }
                </select>
                <svg viewBox="0 0 20 20" fill="none" stroke="#55665E" stroke-width="1.4">
                  <path d="M5 8l5 5 5-5"></path>
                </svg>
              </span>
            </label>
          </div>
          @if (dispoVisible()) {
            <div class="box" [class.box-ok]="dispoOk()" [class.box-err]="!dispoOk()" style="margin-top: 20px;">
              {{ dispoMessage() }}
            </div>
          }
        </div>

        <div class="card step-card">
          <h2 class="step-title">2. Vos coordonnées</h2>
          <div class="coords-grid">
            <label class="field">
              <span class="field-label">Prénom</span>
              <input type="text" [value]="prenom()" (input)="setField('prenom', $event)" placeholder="Marie" />
            </label>
            <label class="field">
              <span class="field-label">Nom</span>
              <input type="text" [value]="nom()" (input)="setField('nom', $event)" placeholder="Dupont" />
            </label>
            <label class="field">
              <span class="field-label">E-mail</span>
              <input type="email" [value]="email()" (input)="setField('email', $event)" placeholder="marie.dupont@mail.com" />
            </label>
            <label class="field">
              <span class="field-label">Téléphone</span>
              <input type="tel" [value]="tel()" (input)="setField('tel', $event)" placeholder="+596 696 12 34 56" />
            </label>
            <label class="field span-2">
              <span class="field-label">Message (facultatif)</span>
              <textarea
                rows="4"
                [value]="message()"
                (input)="setField('message', $event)"
                placeholder="Précisez toute demande particulière : heure d'arrivée, lit bébé, etc."
              ></textarea>
            </label>
          </div>
          <div class="submit-row">
            <button type="button" class="btn btn-lg" (click)="submit()" [disabled]="busy()">Demander mon devis</button>
            <span class="note">{{ auth.signedIn() ? "Sans engagement · réponse sous 24 h" : "Sans engagement · réponse sous 24 h · un compte est demandé à l'envoi" }}</span>
          </div>
          @if (formError()) {
            <div class="box box-err" style="margin-top: 18px;">{{ formError() }}</div>
          }
          @if (envoye()) {
            <div class="box box-ok success" style="margin-top: 18px;">
              <svg viewBox="0 0 20 20" fill="none" stroke="#1E4436" stroke-width="1.5">
                <circle cx="10" cy="10" r="8.4"></circle>
                <path d="M6.4 10.3l2.6 2.6 4.8-5.2"></path>
              </svg>
              <span>
                Votre demande a bien été envoyée. Vous recevrez votre devis détaillé par e-mail, et le
                propriétaire vous recontactera sous 24 h. Suivez-la depuis
                <a routerLink="/espace-client">votre espace client</a>.
              </span>
            </div>
          }
        </div>
      </div>

      <aside class="card estimate">
        <img src="images/kiosque.jpg" alt="Le kiosque et la piscine" class="estimate-img" />
        @if (result(); as r) {
          <h2 class="estimate-title">Votre devis</h2>
          <div class="estimate-sub">{{ resumeDates() }}</div>
          <div class="estimate-lines">
            <div class="line">
              <span>Séjour ({{ r.nights }} nuits)</span>
              <span class="strong">{{ euros(r.totalAmount) }}</span>
            </div>
            <div class="line">
              <span>Forfait ménage</span>
              <span class="strong">{{ euros(r.householdAmount) }}</span>
            </div>
          </div>
          <div class="total-row">
            <span class="total-label">Total du séjour</span>
            <span class="total-value">{{ euros(r.totalAmount + r.householdAmount) }}</span>
          </div>
          <p class="estimate-note">
            Caution de {{ euros(r.depositAmount) }} demandée à la réservation, restituée après le séjour.
            Taxes touristiques ({{ euros(r.unrankedTouristTax) }}) calculées dans le devis final.
          </p>
        } @else {
          <h2 class="estimate-title">Votre estimation</h2>
          <div class="estimate-sub">{{ resumeDates() }}</div>
          @if (estimate(); as est) {
            <div class="estimate-lines">
              <div class="line">
                <span>{{ est.nights }} nuit{{ est.nights > 1 ? "s" : "" }} × {{ euros(est.nightly) }}</span>
                <span class="strong">{{ euros(est.subtotal) }}</span>
              </div>
              @if (est.discountPercent > 0) {
                <div class="line discount">
                  <span>Remise {{ est.discountPercent }} % (séjour de {{ est.nights }} nuits)</span>
                  <span>− {{ euros(est.discountAmount) }}</span>
                </div>
              }
              <div class="line">
                <span>Forfait ménage</span>
                <span class="strong">{{ euros(est.household) }}</span>
              </div>
            </div>
            <div class="total-row">
              <span class="total-label">Total estimé</span>
              <span class="total-value">{{ euros(est.total) }}</span>
            </div>
          } @else {
            <div class="estimate-lines">
              <div class="line"><span>Séjour</span><span class="strong">—</span></div>
              <div class="line"><span>Forfait ménage</span><span class="strong">—</span></div>
            </div>
            <div class="total-row">
              <span class="total-label">Total estimé</span>
              <span class="total-value">—</span>
            </div>
          }
          <p class="estimate-note">
            Caution de 2 000 € demandée à la réservation, restituée après le séjour. Taxes touristiques
            calculées dans le devis final.
          </p>
        }
      </aside>
    </section>
  `,
  styles: `
    .intro {
      padding-top: 56px;
      padding-bottom: 20px;
    }
    .intro .kicker {
      margin-bottom: 16px;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 48px;
      line-height: 1.12;
      color: var(--title);
      margin: 0 0 18px;
      text-wrap: pretty;
    }
    .text {
      font-size: 15.5px;
      line-height: 1.7;
      color: #4b5c54;
      margin: 0;
      max-width: 40em;
    }
    .layout {
      padding-top: 28px;
      padding-bottom: 64px;
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 28px;
      align-items: start;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .step-card {
      padding: 30px 32px;
    }
    .step-title {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 26px;
      color: var(--title);
      margin: 0 0 22px;
    }
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .select-wrap {
      position: relative;
      display: block;
    }
    .select-wrap select {
      width: 100%;
      padding: 12px 38px 12px 14px;
      border: 1px solid var(--field-border);
      border-radius: 5px;
      font-size: 14px;
      color: var(--ink-strong);
      background: #ffffff;
      appearance: none;
    }
    .select-wrap svg {
      position: absolute;
      right: 13px;
      top: 14px;
      width: 14px;
      height: 14px;
      pointer-events: none;
    }
    .coords-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .span-2 {
      grid-column: span 2;
    }
    .submit-row {
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
    }
    .note {
      font-size: 13px;
      color: var(--muted-2);
    }
    .success {
      display: flex;
      gap: 13px;
      align-items: flex-start;
    }
    .success svg {
      flex-shrink: 0;
      margin-top: 1px;
      width: 19px;
      height: 19px;
    }
    .success a {
      text-decoration: underline;
    }
    .estimate {
      background: var(--cream);
      border: none;
      padding: 28px 30px;
      position: sticky;
      top: 24px;
    }
    .estimate-img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 5px;
      display: block;
      margin-bottom: 20px;
    }
    .estimate-title {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 24px;
      color: var(--title);
      margin: 0 0 4px;
    }
    .estimate-sub {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 20px;
    }
    .estimate-lines {
      display: flex;
      flex-direction: column;
      gap: 13px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e4dac8;
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
      color: var(--label);
    }
    .line .strong {
      color: var(--ink-strong);
    }
    .line.discount {
      color: #2e6b4f;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 0 6px;
    }
    .total-label {
      font-size: 15px;
      font-weight: 500;
      color: var(--title);
    }
    .total-value {
      font-family: var(--serif);
      font-size: 28px;
      color: var(--title);
      line-height: 1;
    }
    .estimate-note {
      font-size: 12.5px;
      line-height: 1.6;
      color: var(--muted-2);
      margin: 12px 0 0;
    }
    @media (max-width: 1000px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .estimate {
        position: static;
      }
    }
    @media (max-width: 720px) {
      .dates-grid,
      .coords-grid {
        grid-template-columns: 1fr;
      }
      .span-2 {
        grid-column: span 1;
      }
      .title {
        font-size: 36px;
      }
    }
  `,
})
export class QuotationPage {
  readonly #route = inject(ActivatedRoute)
  readonly #router = inject(Router)
  readonly auth = inject(Auth)
  readonly #bookings = inject(BookingService)
  readonly #profiles = inject(ProfileService)
  readonly #funnel = inject(QuoteFunnelStore)

  readonly arrivee = signal("")
  readonly depart = signal("")
  readonly voyageurs = signal("2")
  readonly prenom = signal("")
  readonly nom = signal("")
  readonly email = signal("")
  readonly tel = signal("")
  readonly message = signal("")

  readonly availability = signal<Availability>("unknown")
  readonly formError = signal("")
  readonly envoye = signal(false)
  readonly busy = signal(false)
  readonly result = signal<QuotationResult | null>(null)

  readonly estimate = computed(() => estimateStay(this.arrivee(), this.depart()))
  readonly euros = euros

  readonly dispoVisible = computed(() => this.arrivee() !== "" && this.depart() !== "")

  readonly dispoOk = computed(() => this.availability() === "available")

  readonly dispoMessage = computed(() => {
    if (this.availability() === "invalid") {
      return "La date de départ doit être postérieure à la date d'arrivée."
    }
    if (this.availability() === "unavailable") {
      return "La villa n'est pas disponible pour ces dates. Choisissez une autre période."
    }
    const nights = nightsBetween(this.arrivee(), this.depart())
    return `La villa est disponible du ${longDate(this.arrivee())} au ${longDate(this.depart())} · ${nights} nuit${nights > 1 ? "s" : ""}.`
  })

  readonly resumeDates = computed(() => {
    const nights = nightsBetween(this.arrivee(), this.depart())
    if (nights === 0) return "Sélectionnez vos dates pour voir l'estimation"
    return `Du ${longDate(this.arrivee())} au ${longDate(this.depart())} · ${this.voyageurs()} voyageurs`
  })

  constructor() {
    // Query params (the landing handoff) render identically on server and
    // client; browser-only storages are merged after hydration instead.
    const params = this.#route.snapshot.queryParamMap
    this.arrivee.set(params.get("arrivee") ?? "")
    this.depart.set(params.get("depart") ?? "")
    const guests = params.get("voyageurs")
    this.voyageurs.set(guests !== null && guests !== "" ? guests : "2")

    afterNextRender(() => {
      const stay = fillStayGaps(
        { arrivee: this.arrivee(), depart: this.depart(), voyageurs: this.voyageurs() },
        this.#funnel.stay(),
      )
      this.arrivee.set(stay.arrivee)
      this.depart.set(stay.depart)
      this.voyageurs.set(stay.voyageurs)
      this.applyContact(this.#funnel.contact())
      this.message.set(this.#funnel.message())
      if (stay.arrivee !== "" && stay.depart !== "") void this.checkAvailability()
    })

    if (this.auth.signedIn()) void this.prefillFromProfile()
  }

  onArrivee(event: Event): void {
    this.arrivee.set((event.target as HTMLInputElement).value)
    this.result.set(null)
    this.envoye.set(false)
    this.persistStay()
    void this.checkAvailability()
  }

  onDepart(event: Event): void {
    this.depart.set((event.target as HTMLInputElement).value)
    this.result.set(null)
    this.envoye.set(false)
    this.persistStay()
    void this.checkAvailability()
  }

  onVoyageurs(event: Event): void {
    this.voyageurs.set((event.target as HTMLSelectElement).value)
    this.persistStay()
  }

  setField(key: "prenom" | "nom" | "email" | "tel" | "message", event: Event): void {
    this[key].set((event.target as HTMLInputElement | HTMLTextAreaElement).value)
    this.formError.set("")
    this.persistContact()
  }

  async submit(): Promise<void> {
    const nights = nightsBetween(this.arrivee(), this.depart())
    if (nights === 0) {
      this.formError.set("Indiquez vos dates d'arrivée et de départ.")
      return
    }
    if (this.prenom() === "" || this.nom() === "" || this.email() === "") {
      this.formError.set("Merci de renseigner votre prénom, nom et e-mail.")
      return
    }
    if (this.availability() === "unavailable") {
      this.formError.set("Ces dates ne sont pas disponibles. Choisissez une autre période.")
      return
    }
    this.persistStay()
    this.persistContact()

    // F1: sending the request requires an account — but nothing is lost:
    // the whole form is submitted as a server-side quotation lead, and the
    // claim at sign-in turns it into the real quotation request.
    if (!this.auth.signedIn()) {
      this.busy.set(true)
      this.formError.set("")
      try {
        await this.#bookings.submitLead({
          email: this.email(),
          firstname: this.prenom(),
          lastname: this.nom(),
          phoneNumber: this.tel(),
          villaId: VILLA_ID,
          from: this.arrivee(),
          to: this.depart(),
          adultsCount: Number(this.voyageurs()),
          childrenCount: 0,
          ...(this.message() !== "" ? { message: this.message() } : {}),
        })
        this.#funnel.markPendingLead()
        await this.#router.navigate(["/connexion"], { queryParams: { mode: "inscription" } })
      } catch (e) {
        const problem = e as { problem?: { issues?: string[]; message?: string } }
        this.formError.set(problem.problem?.issues?.[0] ?? problem.problem?.message ?? "Demande impossible.")
      } finally {
        this.busy.set(false)
      }
      return
    }

    this.busy.set(true)
    this.formError.set("")
    try {
      // Keep the profile fresh with the contact details used for the request.
      try {
        await this.#profiles.save({
          email: this.email(),
          firstname: this.prenom(),
          lastname: this.nom(),
          phoneNumber: this.tel(),
        })
      } catch {
        // A stale profile must not block the quotation itself.
      }
      const response = await this.#bookings.requestQuotation({
        villaId: VILLA_ID,
        from: this.arrivee(),
        to: this.depart(),
        adultsCount: Number(this.voyageurs()),
        childrenCount: 0,
        ...(this.message() !== "" ? { message: this.message() } : {}),
      })
      this.result.set({
        nights,
        totalAmount: response.pricing["totalAmount"] ?? 0,
        unrankedTouristTax: response.pricing["unrankedTouristTax"] ?? 0,
        depositAmount: response.pricing["depositAmount"] ?? 0,
        householdAmount: response.pricing["householdAmount"] ?? 0,
      })
      this.envoye.set(true)
    } catch (e) {
      const problem = e as { problem?: { issues?: string[]; message?: string } }
      this.formError.set(problem.problem?.issues?.[0] ?? problem.problem?.message ?? "Demande impossible.")
    } finally {
      this.busy.set(false)
    }
  }

  /** Profile fills the gaps only — the visitor's own latest input wins. */
  private async prefillFromProfile(): Promise<void> {
    try {
      const { profile } = await this.#profiles.get()
      if (profile !== null) {
        this.applyContact({
          prenom: profile.firstname || undefined,
          nom: profile.lastname || undefined,
          email: profile.email || undefined,
          tel: profile.phoneNumber || undefined,
        })
      }
    } catch {
      // No profile yet (or offline): keep whatever the storages restored.
    }
  }

  /** Gap-fills the contact fields; never overwrites what the visitor typed. */
  private applyContact(source: Partial<ContactState>): void {
    const merged = fillContactGaps(
      { prenom: this.prenom(), nom: this.nom(), email: this.email(), tel: this.tel() },
      source,
    )
    this.prenom.set(merged.prenom)
    this.nom.set(merged.nom)
    this.email.set(merged.email)
    this.tel.set(merged.tel)
  }

  private persistStay(): void {
    this.#funnel.patchStay({ arrivee: this.arrivee(), depart: this.depart(), voyageurs: this.voyageurs() })
  }

  private persistContact(): void {
    this.#funnel.patchContact({ prenom: this.prenom(), nom: this.nom(), email: this.email(), tel: this.tel() })
    this.#funnel.setMessage(this.message())
  }

  private async checkAvailability(): Promise<void> {
    const from = this.arrivee()
    const to = this.depart()
    if (from === "" || to === "") {
      this.availability.set("unknown")
      return
    }
    if (nightsBetween(from, to) === 0) {
      this.availability.set("invalid")
      return
    }
    this.availability.set("checking")
    try {
      const { available } = await this.#bookings.checkAvailability(VILLA_ID, from, to)
      this.availability.set(available ? "available" : "unavailable")
    } catch {
      this.availability.set("unknown")
    }
  }
}

const longDate = (isoDay: string): string =>
  new Date(`${isoDay}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
