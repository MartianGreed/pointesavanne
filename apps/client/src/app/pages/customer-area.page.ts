import { Component, computed, inject, signal, viewChild } from "@angular/core"
import { ElementRef } from "@angular/core"
import { RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"
import { passkeyErrorMessage } from "../core/passkey-errors"
import { BookingService, type BookingRow } from "../core/booking.service"
import { ProfileService, type Profile } from "../core/profile.service"
import { longDate, statusStyle } from "../shared/booking-status"
import { euros } from "../shared/estimate"

type Tab = "reservations" | "documents" | "profil"

type ProfileField = "firstname" | "lastname" | "email" | "phoneNumber" | "line1"

interface DocumentRow {
  readonly name: string
  readonly detail: string
  readonly badge: string
  readonly badgeBg: string
  readonly badgeColor: string
  readonly href?: string
}

/** The customer area: reservations, documents and profile, per the design. */
@Component({
  selector: "app-customer-area",
  imports: [RouterLink],
  template: `
    <section class="container layout">
      <aside class="sidebar">
        <div class="identity">
          <span class="avatar">{{ initiales() }}</span>
          <span class="identity-text">
            <span class="name">{{ nomComplet() }}</span>
            <span class="email">{{ emailProfil() }}</span>
          </span>
        </div>
        @for (t of tabs; track t.id) {
          <button
            type="button"
            class="tab"
            [class.active]="onglet() === t.id"
            (click)="onglet.set(t.id)"
          >
            {{ t.label }}
          </button>
        }
        <div class="sidebar-footer">
          <a routerLink="/devis">+ Nouvelle demande de devis</a>
        </div>
      </aside>

      <div class="content">
        @if (onglet() === "reservations") {
          <h1 class="page-title">Mes réservations</h1>
          @if (bookings().length === 0) {
            <div class="card empty">
              <p>Aucune demande pour le moment.</p>
              <a routerLink="/devis" class="btn btn-sm">Demander un devis</a>
            </div>
          }
          @for (b of bookings(); track b.bookingId) {
            <div class="card booking">
              <div class="booking-head">
                <span class="booking-dates">{{ longDate(b.from) }} → {{ longDate(b.to) }}</span>
                <span
                  class="badge"
                  [style.background]="style(b.status).bg"
                  [style.color]="style(b.status).color"
                >
                  {{ style(b.status).label }}
                </span>
                <span class="booking-total">{{ euros(b.totalAmount) }}</span>
              </div>
              <div class="booking-meta">
                <span>{{ b.nights }} nuit{{ b.nights > 1 ? "s" : "" }}</span>
                <span>{{ b.adultsCount + b.childrenCount }} voyageurs</span>
                <span>Référence {{ b.bookingId }}</span>
              </div>
              @if (style(b.status).nextStep) {
                <div class="next-step">{{ style(b.status).nextStep }}</div>
              }
              <div class="actions">
                @if (b.status === "quotation-awaiting-acceptation") {
                  <button type="button" class="btn btn-sm" (click)="openFilePicker(b)">
                    Signer le devis en ligne
                  </button>
                }
                @if (b.pdfPath) {
                  <a class="btn btn-outline btn-sm" [href]="b.pdfPath" target="_blank" rel="noopener">
                    Télécharger le devis (PDF)
                  </a>
                }
              </div>
            </div>
          }
        }

        @if (onglet() === "documents") {
          <h1 class="page-title">Mes documents</h1>
          @if (documents().length === 0) {
            <div class="card empty">
              <p>Aucun document pour le moment. Vos devis apparaîtront ici dès qu'ils seront prêts.</p>
            </div>
          }
          <div class="card doc-list">
            @for (d of documents(); track d.name) {
              <div class="doc-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
                  <path d="M6 2.5h8.5L19 7v14.5H6z"></path>
                  <path d="M9 12h7M9 15.5h7M9 19h4"></path>
                </svg>
                <span class="doc-text">
                  <span class="doc-name">{{ d.name }}</span>
                  <span class="doc-detail">{{ d.detail }}</span>
                </span>
                <span class="badge" [style.background]="d.badgeBg" [style.color]="d.badgeColor">{{ d.badge }}</span>
                @if (d.href) {
                  <a class="btn btn-outline btn-xs" [href]="d.href" target="_blank" rel="noopener">Télécharger</a>
                } @else {
                  <span class="doc-soon">Bientôt disponible</span>
                }
              </div>
            }
          </div>
        }

        @if (onglet() === "profil") {
          <h1 class="page-title">Mon profil</h1>
          @if (profile(); as p) {
            <div class="card profil-card">
              <div class="profil-grid">
                <label class="field">
                  <span class="field-label">Prénom</span>
                  <input type="text" [value]="p.firstname" (input)="setProfileField('firstname', $event)" />
                </label>
                <label class="field">
                  <span class="field-label">Nom</span>
                  <input type="text" [value]="p.lastname" (input)="setProfileField('lastname', $event)" />
                </label>
                <label class="field">
                  <span class="field-label">E-mail</span>
                  <input type="email" [value]="p.email" (input)="setProfileField('email', $event)" />
                </label>
                <label class="field">
                  <span class="field-label">Téléphone</span>
                  <input type="tel" [value]="p.phoneNumber" (input)="setProfileField('phoneNumber', $event)" />
                </label>
                <label class="field span-2">
                  <span class="field-label">Adresse postale</span>
                  <input
                    type="text"
                    [value]="p.line1 ?? ''"
                    (input)="setProfileField('line1', $event)"
                    placeholder="N°, rue, code postal, ville, pays"
                  />
                </label>
              </div>

              <div class="password-block">
                <label class="field">
                  <span class="field-label">Mot de passe actuel</span>
                  <input type="password" [value]="mdpActuel()" (input)="mdpActuel.set(inputValue($event))" autocomplete="current-password" />
                </label>
                <label class="field">
                  <span class="field-label">Nouveau mot de passe</span>
                  <input type="password" [value]="nouveauMdp()" (input)="nouveauMdp.set(inputValue($event))" placeholder="Laisser vide pour ne pas changer" autocomplete="new-password" />
                </label>
                <label class="field">
                  <span class="field-label">Confirmer le nouveau mot de passe</span>
                  <input type="password" [value]="nouveauMdp2()" (input)="nouveauMdp2.set(inputValue($event))" autocomplete="new-password" />
                </label>
              </div>

              <div class="passkey-block">
                <span class="field-label">Clé d'accès (connexion sans mot de passe)</span>
                <p class="passkey-text">
                  Enregistrez une clé d'accès sur cet appareil — Face ID, Touch ID, Windows Hello ou une
                  clé de sécurité USB — pour vous connecter en un geste, sans mot de passe.
                </p>
                <button type="button" class="btn btn-outline btn-sm" (click)="ajouterPasskey()" [disabled]="busy()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-right: 8px;">
                    <circle cx="8" cy="15" r="4.2"></circle>
                    <path d="M10.8 12.2L21 2M16 7l3 3M13 10l2 2"></path>
                  </svg>
                  Enregistrer une clé d'accès
                </button>
              </div>

              @if (message(); as m) {
                <div class="box" [class.box-ok]="m.ok" [class.box-err]="!m.ok" style="margin-top: 22px;">
                  {{ m.text }}
                </div>
              }
              <button type="button" class="btn btn-md" style="margin-top: 26px;" (click)="enregistrer()" [disabled]="busy()">
                Enregistrer les modifications
              </button>
            </div>
          }
        }
      </div>
    </section>

    <input
      #fileInput
      type="file"
      class="hidden-input"
      accept="application/pdf,image/*"
      (change)="uploadSelected($event)"
    />
  `,
  styles: `
    .layout {
      padding-top: 48px;
      padding-bottom: 72px;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 28px;
      align-items: start;
    }
    .sidebar {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 26px 22px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: sticky;
      top: 24px;
    }
    .identity {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 6px 20px;
    }
    .avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--green);
      color: #ffffff;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .identity-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .name {
      font-size: 15px;
      color: var(--title);
      font-weight: 500;
    }
    .email {
      font-size: 12.5px;
      color: var(--muted-2);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tab {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 13px 14px;
      border: none;
      border-radius: 6px;
      text-align: left;
      font-size: 14px;
      cursor: pointer;
      background: transparent;
      color: #33443c;
    }
    .tab.active {
      background: var(--green);
      color: #ffffff;
      font-weight: 500;
    }
    .sidebar-footer {
      border-top: 1px solid #ede9e0;
      margin-top: 16px;
      padding: 16px 6px 0;
    }
    .sidebar-footer a {
      font-size: 13.5px;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .page-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 36px;
      color: var(--title);
      margin: 6px 0 2px;
    }
    .empty {
      padding: 30px 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      font-size: 14px;
      color: var(--muted);
    }
    .booking {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .booking-head {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .booking-dates {
      font-size: 15.5px;
      color: var(--title);
      font-weight: 500;
    }
    .booking-total {
      margin-left: auto;
      font-family: var(--serif);
      font-size: 25px;
      color: var(--title);
    }
    .booking-meta {
      display: flex;
      gap: 26px;
      flex-wrap: wrap;
      font-size: 13.5px;
      color: var(--muted);
    }
    .next-step {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--label);
      background: #f7f4ee;
      border-radius: 6px;
      padding: 12px 15px;
    }
    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .doc-list {
      overflow: hidden;
    }
    .doc-row {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px 26px;
      border-bottom: 1px solid var(--line-soft);
    }
    .doc-row:last-child {
      border-bottom: none;
    }
    .doc-row svg {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .doc-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .doc-name {
      font-size: 14px;
      color: var(--ink-strong);
    }
    .doc-detail {
      font-size: 12.5px;
      color: var(--muted-2);
    }
    .doc-row .badge {
      margin-left: auto;
    }
    .doc-soon {
      font-size: 12.5px;
      color: var(--muted-2);
      white-space: nowrap;
    }
    .profil-card {
      padding: 30px 32px;
    }
    .profil-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .span-2 {
      grid-column: span 2;
    }
    .password-block {
      border-top: 1px solid var(--line-soft);
      margin-top: 26px;
      padding-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .passkey-block {
      border-top: 1px solid var(--line-soft);
      margin-top: 26px;
      padding-top: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .passkey-text {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--muted);
      margin: 0 0 6px;
      max-width: 46em;
    }
    .hidden-input {
      display: none;
    }
    @media (max-width: 1000px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: static;
      }
    }
    @media (max-width: 720px) {
      .profil-grid,
      .password-block {
        grid-template-columns: 1fr;
      }
      .span-2 {
        grid-column: span 1;
      }
      .doc-row {
        flex-wrap: wrap;
      }
    }
  `,
})
export class CustomerAreaPage {
  readonly #auth = inject(Auth)
  readonly #profiles = inject(ProfileService)
  readonly #bookings = inject(BookingService)

  readonly tabs: readonly { id: Tab; label: string }[] = [
    { id: "reservations", label: "Mes réservations" },
    { id: "documents", label: "Mes documents" },
    { id: "profil", label: "Mon profil" },
  ]

  readonly onglet = signal<Tab>("reservations")
  readonly profile = signal<Profile | null>(null)
  readonly bookings = signal<BookingRow[]>([])
  readonly busy = signal(false)
  readonly message = signal<{ text: string; ok: boolean } | null>(null)

  readonly mdpActuel = signal("")
  readonly nouveauMdp = signal("")
  readonly nouveauMdp2 = signal("")

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>("fileInput")
  #uploadBookingId: string | null = null

  readonly style = statusStyle
  readonly longDate = longDate
  readonly euros = euros

  readonly initiales = computed(() => {
    const p = this.profile()
    if (p === null) return "…"
    return `${p.firstname.charAt(0)}${p.lastname.charAt(0)}`.toUpperCase() || "?"
  })

  readonly nomComplet = computed(() => {
    const p = this.profile()
    return p === null ? "" : `${p.firstname} ${p.lastname}`.trim()
  })

  readonly emailProfil = computed(() => this.profile()?.email ?? this.#auth.user()?.email ?? "")

  readonly documents = computed<DocumentRow[]>(() => {
    const rows: DocumentRow[] = []
    for (const b of this.bookings()) {
      const dates = `${longDate(b.from)} → ${longDate(b.to)}`
      if (b.pdfPath !== undefined) {
        rows.push({
          name: `Devis ${b.bookingId}.pdf`,
          detail: dates,
          badge: "Devis",
          badgeBg: "#E7EEF7",
          badgeColor: "#2C517E",
          href: b.pdfPath,
        })
      }
      if (b.signedFileName !== undefined) {
        rows.push({
          name: b.signedFileName,
          detail: "Devis signé téléversé",
          badge: "Signé",
          badgeBg: "#EAF0EA",
          badgeColor: "#1E4436",
        })
      }
      if (b.status === "contract-sent") {
        rows.push({
          name: `Confirmation de réservation ${b.bookingId}.pdf`,
          detail: "Validée par le propriétaire",
          badge: "Confirmation",
          badgeBg: "#1E4436",
          badgeColor: "#FFFFFF",
        })
      }
    }
    return rows
  })

  constructor() {
    void this.load()
  }

  async load(): Promise<void> {
    try {
      const { profile } = await this.#profiles.get()
      this.profile.set(profile ?? this.emptyProfile())
    } catch {
      this.profile.set(this.emptyProfile())
    }
    try {
      const { items } = await this.#bookings.myBookings()
      this.bookings.set(items)
    } catch {
      this.bookings.set([])
    }
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value
  }

  setProfileField(key: ProfileField, event: Event): void {
    const value = this.inputValue(event)
    this.profile.update((p) => (p === null ? p : ({ ...p, [key]: value } as Profile)))
    this.message.set(null)
  }

  async enregistrer(): Promise<void> {
    const p = this.profile()
    if (p === null) return
    if (p.firstname === "" || p.lastname === "" || p.email === "") {
      this.message.set({ text: "Prénom, nom et e-mail sont obligatoires.", ok: false })
      return
    }
    if (this.nouveauMdp() !== "" || this.nouveauMdp2() !== "") {
      if (this.mdpActuel() === "") {
        this.message.set({ text: "Saisissez votre mot de passe actuel pour le changer.", ok: false })
        return
      }
      if (this.nouveauMdp().length < 8) {
        this.message.set({ text: "Le nouveau mot de passe doit contenir au moins 8 caractères.", ok: false })
        return
      }
      if (this.nouveauMdp() !== this.nouveauMdp2()) {
        this.message.set({ text: "Les deux mots de passe ne correspondent pas.", ok: false })
        return
      }
    }
    this.busy.set(true)
    try {
      const saved = await this.#profiles.save({
        email: p.email,
        firstname: p.firstname,
        lastname: p.lastname,
        phoneNumber: p.phoneNumber,
        ...(p.language !== undefined ? { language: p.language } : {}),
        ...(p.line1 !== undefined && p.line1 !== "" ? { line1: p.line1 } : {}),
        ...(p.line3 !== undefined && p.line3 !== "" ? { line3: p.line3 } : {}),
      })
      this.profile.set(saved)
      if (this.nouveauMdp() !== "") {
        await this.#auth.changePassword(this.mdpActuel(), this.nouveauMdp())
        this.mdpActuel.set("")
        this.nouveauMdp.set("")
        this.nouveauMdp2.set("")
      }
      this.message.set({ text: "Profil enregistré.", ok: true })
    } catch (e) {
      const problem = e as { problem?: { issues?: string[]; message?: string } }
      this.message.set({ text: problem.problem?.issues?.[0] ?? problem.problem?.message ?? "Enregistrement impossible.", ok: false })
    } finally {
      this.busy.set(false)
    }
  }

  /** Enrolls a passkey for the signed-in user via the browser ceremony. */
  async ajouterPasskey(): Promise<void> {
    this.busy.set(true)
    this.message.set(null)
    try {
      await this.#auth.registerPasskey()
      this.message.set({
        text: "Clé d'accès enregistrée. Vous pouvez maintenant vous connecter sans mot de passe depuis cet appareil.",
        ok: true,
      })
    } catch (e) {
      this.message.set({ text: passkeyErrorMessage(e, "Enregistrement de la clé d'accès impossible."), ok: false })
    } finally {
      this.busy.set(false)
    }
  }

  openFilePicker(booking: BookingRow): void {
    this.#uploadBookingId = booking.bookingId
    this.fileInput().nativeElement.click()
  }

  async uploadSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    const bookingId = this.#uploadBookingId
    input.value = ""
    this.#uploadBookingId = null
    if (file === undefined || bookingId === null) return
    try {
      await this.#bookings.uploadSignedQuotation(bookingId, file)
      this.message.set({ text: "Devis signé téléversé. Le propriétaire va valider votre réservation.", ok: true })
      await this.load()
    } catch {
      this.message.set({ text: "Téléversement impossible. Vérifiez le fichier et réessayez.", ok: false })
    }
  }

  private emptyProfile(): Profile {
    return {
      customerId: "",
      email: this.#auth.user()?.email ?? "",
      firstname: "",
      lastname: "",
      phoneNumber: "",
    }
  }
}
