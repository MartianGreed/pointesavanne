import { Component, computed, inject, signal } from "@angular/core"
import { BookingService, type BookingRow } from "../core/booking.service"
import { shortDate, statusStyle } from "../shared/booking-status"
import { euros } from "../shared/estimate"

interface StatCard {
  readonly label: string
  readonly value: string
  readonly detail: string
}

/**
 * The villa owner's review screen: stats over the pipeline, status filters
 * and one row per booking with the validation actions.
 */
@Component({
  selector: "app-owner-bookings",
  imports: [],
  template: `
    <section class="container layout">
      <div class="head">
        <h1 class="title">Gestion des réservations</h1>
      </div>

      <div class="stats">
        @for (stat of stats(); track stat.label) {
          <div class="card stat">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-detail">{{ stat.detail }}</span>
          </div>
        }
      </div>

      <div class="filters">
        @for (f of filters; track f) {
          <button type="button" class="pill" [class.active]="filtre() === f" (click)="setFiltre(f)">
            {{ label(f) }}
          </button>
        }
      </div>

      <div class="card table">
        <div class="table-head">
          <span>CLIENT</span><span>SÉJOUR</span><span>VOYAGEURS</span><span>MONTANT</span><span>STATUT</span>
          <span class="right">ACTIONS</span>
        </div>
        @for (b of visible(); track b.bookingId) {
          <div class="row">
            <span class="cell-client">
              <span class="client-name">{{ b.customerId }}</span>
              <span class="client-ref">{{ b.bookingId }}</span>
            </span>
            <span class="cell-stay">
              <span class="stay-dates">{{ shortDate(b.from) }} → {{ shortDate(b.to) }}</span>
              <span class="stay-nights">{{ b.nights }} nuits</span>
            </span>
            <span class="cell-guests">{{ b.adultsCount + b.childrenCount }}</span>
            <span class="cell-amount">{{ euros(b.totalAmount) }}</span>
            <span>
              <span
                class="badge"
                [style.background]="style(b.status).bg"
                [style.color]="style(b.status).color"
              >
                {{ style(b.status).label }}
              </span>
            </span>
            <span class="cell-actions">
              @if (b.status === "quotation-signed") {
                <button type="button" class="btn btn-green btn-xs" (click)="valider(b)">
                  Valider la réservation
                </button>
                <button type="button" class="btn btn-plain-danger btn-xs" (click)="refuser(b)">
                  Refuser
                </button>
              }
              @if (b.status === "quotation-awaiting-acceptation") {
                <button type="button" class="btn btn-outline btn-xs" (click)="relancer(b)">Relancer</button>
              }
            </span>
          </div>
        }
        @if (visible().length === 0) {
          <div class="empty">Aucune réservation dans ce filtre.</div>
        }
      </div>

      @if (notification()) {
        <div class="box box-ok">{{ notification() }}</div>
      }

      <div class="card upcoming">
        <h2 class="upcoming-title">Prochains séjours confirmés</h2>
        <div class="upcoming-list">
          @for (b of confirmed(); track b.bookingId) {
            <div class="upcoming-row">
              <span class="dot"></span>
              <span class="upcoming-dates">{{ shortDate(b.from) }} → {{ shortDate(b.to) }}</span>
              <span class="upcoming-meta">{{ b.customerId }} · {{ b.adultsCount + b.childrenCount }} voyageurs</span>
              <span class="upcoming-amount">{{ euros(b.totalAmount) }}</span>
            </div>
          }
          @if (confirmed().length === 0) {
            <div class="upcoming-none">Aucun séjour confirmé pour le moment.</div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .layout {
      padding-top: 48px;
      padding-bottom: 72px;
      display: flex;
      flex-direction: column;
      gap: 26px;
    }
    .head {
      display: flex;
      align-items: flex-end;
      gap: 20px;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 40px;
      color: var(--title);
      margin: 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .stat {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--muted);
    }
    .stat-value {
      font-family: var(--serif);
      font-size: 34px;
      color: var(--title);
      line-height: 1;
    }
    .stat-detail {
      font-size: 12.5px;
      color: var(--muted-2);
    }
    .filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill {
      padding: 10px 18px;
      border-radius: 20px;
      border: 1px solid #dcd7cb;
      background: #ffffff;
      color: #33443c;
      font-size: 13.5px;
      cursor: pointer;
    }
    .pill.active {
      background: var(--green);
      border-color: var(--green);
      color: #ffffff;
    }
    .table {
      overflow: hidden;
    }
    .table-head,
    .row {
      display: grid;
      grid-template-columns: 1.15fr 1.5fr 0.7fr 0.8fr 1fr 1.7fr;
      gap: 14px;
      padding: 14px 26px;
      align-items: center;
    }
    .table-head {
      background: #f7f4ee;
      font-size: 12px;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .table-head .right {
      text-align: right;
    }
    .row {
      padding-top: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line-soft);
    }
    .row:last-of-type {
      border-bottom: none;
    }
    .cell-client,
    .cell-stay {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .client-name {
      font-size: 14px;
      color: var(--ink-strong);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .client-ref {
      font-size: 12px;
      color: var(--muted-2);
    }
    .stay-dates {
      font-size: 13.5px;
      color: #33443c;
    }
    .stay-nights {
      font-size: 12px;
      color: var(--muted-2);
    }
    .cell-guests {
      font-size: 13.5px;
      color: #33443c;
    }
    .cell-amount {
      font-size: 14px;
      color: var(--title);
    }
    .cell-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .empty {
      padding: 34px 26px;
      font-size: 14px;
      color: var(--muted-2);
      text-align: center;
    }
    .upcoming {
      background: var(--cream);
      border: none;
      padding: 30px 34px;
    }
    .upcoming-title {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 26px;
      color: var(--title);
      margin: 0 0 18px;
    }
    .upcoming-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .upcoming-row {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #fffcf7;
      border: 1px solid #ebdcc4;
      border-radius: 6px;
      padding: 15px 20px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--green);
      flex-shrink: 0;
    }
    .upcoming-dates {
      font-size: 14px;
      color: var(--ink-strong);
      font-weight: 500;
    }
    .upcoming-meta {
      font-size: 13.5px;
      color: var(--muted);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .upcoming-amount {
      margin-left: auto;
      font-size: 14px;
      color: var(--title);
      white-space: nowrap;
    }
    .upcoming-none {
      font-size: 13.5px;
      color: var(--muted-2);
    }
    @media (max-width: 1000px) {
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
      .table-head {
        display: none;
      }
      .row {
        grid-template-columns: 1fr 1fr;
        gap: 10px 18px;
      }
      .cell-actions {
        grid-column: span 2;
        justify-content: flex-start;
      }
      .title {
        font-size: 32px;
      }
    }
  `,
})
export class OwnerBookingsPage {
  readonly #bookings = inject(BookingService)

  readonly filters = ["Tout", "quotation-requested", "quotation-awaiting-acceptation", "quotation-signed", "contract-sent"] as const
  readonly filtre = signal<string>("Tout")
  readonly bookings = signal<BookingRow[]>([])
  readonly notification = signal("")

  readonly style = statusStyle
  readonly shortDate = shortDate
  readonly euros = euros

  readonly visible = computed(() => {
    const filtre = this.filtre()
    return filtre === "Tout" ? this.bookings() : this.bookings().filter((b) => b.status === filtre)
  })

  readonly confirmed = computed(() =>
    [...this.bookings()]
      .filter((b) => b.status === "contract-sent")
      .sort((a, b) => a.from.localeCompare(b.from)),
  )

  readonly stats = computed<StatCard[]>(() => {
    const all = this.bookings()
    const count = (status: string): number => all.filter((b) => b.status === status).length
    const confirmedBookings = all.filter((b) => b.status === "contract-sent")
    const revenue = confirmedBookings.reduce((total, b) => total + b.totalAmount, 0)
    return [
      { label: "Nouvelles demandes", value: String(count("quotation-requested")), detail: "à traiter" },
      { label: "Devis en attente", value: String(count("quotation-awaiting-acceptation")), detail: "envoyés, non signés" },
      { label: "À valider", value: String(count("quotation-signed")), detail: "devis signés par le client" },
      { label: "Revenus confirmés", value: euros(revenue), detail: `${confirmedBookings.length} réservation(s)` },
    ]
  })

  constructor() {
    void this.load()
  }

  label(filter: string): string {
    return filter === "Tout" ? "Tout" : statusStyle(filter).label
  }

  setFiltre(filter: string): void {
    this.filtre.set(filter)
    this.notification.set("")
  }

  async load(): Promise<void> {
    try {
      const { items } = await this.#bookings.allBookings()
      this.bookings.set(items)
    } catch {
      this.bookings.set([])
    }
  }

  async valider(booking: BookingRow): Promise<void> {
    await this.#bookings.validateQuotation(booking.bookingId, true)
    this.notification.set(
      `Réservation ${booking.bookingId} confirmée. ${booking.customerId} a été notifié(e).`,
    )
    await this.load()
  }

  async refuser(booking: BookingRow): Promise<void> {
    await this.#bookings.validateQuotation(booking.bookingId, false, "Documents incomplets")
    this.notification.set(`Demande ${booking.bookingId} refusée.`)
    await this.load()
  }

  relancer(booking: BookingRow): void {
    this.notification.set(`Relance envoyée à ${booking.customerId} pour le devis ${booking.bookingId}.`)
  }
}
