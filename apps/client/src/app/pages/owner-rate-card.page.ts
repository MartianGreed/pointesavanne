import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ErrorTranslationKey } from '../core/translations/fr';
import { Internationalization } from '../core/internationalization';
import { RateCardService, type SeasonRow } from '../core/rate-card.service';

/**
 * The owner's rate card: every seasonal price period in one table, plus the
 * form that defines a new one. Overlapping periods are rejected by the API
 * with a message naming the conflict; redefining the exact same period
 * updates its price.
 */
@Component({
  selector: 'app-owner-rate-card',
  imports: [RouterLink],
  template: `
    <section class="container layout">
      <div class="head">
        <h1 class="title">{{ i18n.t('owner.rateCard.title') }}</h1>
        <a routerLink="/proprietaire/reservations" class="btn btn-outline btn-sm">{{
          i18n.t('owner.rateCard.backToBookings')
        }}</a>
      </div>
      <p class="intro">{{ i18n.t('owner.rateCard.intro') }}</p>

      <div class="card form-card">
        <h2 class="section-title">{{ i18n.t('owner.rateCard.form.title') }}</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ i18n.t('owner.rateCard.from') }}</span>
            <input type="date" [value]="from()" (change)="from.set(inputValue($event))" />
          </label>
          <label class="field">
            <span class="field-label">{{ i18n.t('owner.rateCard.to') }}</span>
            <input type="date" [value]="to()" (change)="to.set(inputValue($event))" />
          </label>
          <label class="field">
            <span class="field-label">{{ i18n.t('owner.rateCard.weekly') }}</span>
            <input
              type="number"
              min="1"
              step="1"
              [value]="weekly()"
              (input)="weekly.set(inputValue($event))"
              [placeholder]="i18n.t('owner.rateCard.weeklyPlaceholder')"
            />
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-md" (click)="define()" [disabled]="busy()">
            {{ i18n.t('owner.rateCard.submit') }}
          </button>
          <span class="note">{{ i18n.t('owner.rateCard.note') }}</span>
        </div>
        @if (error()) {
          <div class="box box-err" style="margin-top: 18px;">{{ error() }}</div>
        }
        @if (saved()) {
          <div class="box box-ok" style="margin-top: 18px;">{{ i18n.t('owner.rateCard.saved') }}</div>
        }
      </div>

      <div class="card table-card">
        <h2 class="section-title">{{ i18n.t('owner.rateCard.list.title') }}</h2>
        @if (seasons().length === 0) {
          <p class="empty">{{ i18n.t('owner.rateCard.empty') }}</p>
        } @else {
          <div class="table-head">
            <span>{{ i18n.t('owner.rateCard.list.period') }}</span>
            <span>{{ i18n.t('owner.rateCard.list.weekly') }}</span>
            <span class="right">{{ i18n.t('owner.rateCard.list.actions') }}</span>
          </div>
          @for (season of visible(); track season.seasonId) {
            <div class="row">
              <span class="cell-period">
                {{ i18n.longDate(season.from) }} → {{ i18n.longDate(season.to) }}
              </span>
              <span class="cell-amount">{{ i18n.euros(season.weeklyAmount) }}</span>
              <span class="cell-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-xs"
                  (click)="remove(season)"
                  [disabled]="busy()"
                >
                  {{ i18n.t('owner.rateCard.remove') }}
                </button>
              </span>
            </div>
          }
          @if (hiddenCount() > 0) {
            <div class="past-toggle">
              <button type="button" class="link" (click)="showPast.set(!showPast())">
                {{
                  i18n.t(showPast() ? 'owner.rateCard.hidePast' : 'owner.rateCard.showPast', {
                    count: hiddenCount(),
                  })
                }}
              </button>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .layout {
      padding-top: 48px;
      padding-bottom: 72px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 36px;
      color: var(--title);
      margin: 0;
    }
    .intro {
      font-size: 14.5px;
      line-height: 1.65;
      color: var(--muted);
      margin: 0;
      max-width: 52em;
    }
    .form-card,
    .table-card {
      padding: 26px 30px;
    }
    .section-title {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 22px;
      color: var(--title);
      margin: 0 0 18px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .form-actions {
      margin-top: 22px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .note {
      font-size: 13px;
      color: var(--muted-2);
    }
    .table-head,
    .row {
      display: grid;
      grid-template-columns: 1.6fr 0.8fr 0.8fr;
      gap: 14px;
      padding: 13px 4px;
      align-items: center;
    }
    .table-head {
      padding-top: 0;
      padding-bottom: 0;
      font-size: 12px;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .table-head .right,
    .cell-actions {
      text-align: right;
    }
    .row {
      border-bottom: 1px solid var(--line-soft);
    }
    .row:last-of-type {
      border-bottom: none;
    }
    .cell-period {
      font-size: 14px;
      color: #33443c;
    }
    .cell-amount {
      font-size: 14.5px;
      color: var(--title);
      font-weight: 500;
    }
    .empty {
      font-size: 14px;
      color: var(--muted);
      margin: 0;
      padding: 8px 0 4px;
    }
    .past-toggle {
      padding-top: 14px;
    }
    .link {
      background: none;
      border: none;
      padding: 0;
      color: var(--green);
      font-size: 13px;
      text-decoration: underline;
      cursor: pointer;
    }
    @media (max-width: 720px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .title {
        font-size: 30px;
      }
    }
  `,
})
export class OwnerRateCardPage {
  readonly i18n = inject(Internationalization);
  readonly #rateCard = inject(RateCardService);

  readonly villaId = 'villa-de-standing-pointe-savanne';

  readonly from = signal('');
  readonly to = signal('');
  readonly weekly = signal('');

  readonly seasons = signal<SeasonRow[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly showPast = signal(false);

  /** Today (ISO) — past seasons stay out of the way until asked for. */
  readonly today = new Date().toISOString().slice(0, 10);

  readonly visible = computed(() => {
    const seasons = this.seasons();
    return this.showPast() ? seasons : seasons.filter((season) => season.to >= this.today);
  });

  readonly hiddenCount = computed(() => this.seasons().length - this.visible().length);

  constructor() {
    void this.load();
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async load(): Promise<void> {
    try {
      const { items } = await this.#rateCard.seasons(this.villaId);
      this.seasons.set(items);
    } catch (cause) {
      this.error.set(this.message(cause, 'errors.pricing.load'));
    }
  }

  /** Backend issues (e.g. which period overlaps) are the useful message. */
  private message(cause: unknown, fallback: ErrorTranslationKey): string {
    const problem = (cause as { problem?: { issues?: readonly string[] } })?.problem;
    if (problem?.issues !== undefined && problem.issues.length > 0) return problem.issues.join(' ');
    return this.i18n.error(cause, fallback);
  }

  async define(): Promise<void> {
    this.saved.set(false);
    if (this.from() === '' || this.to() === '' || this.weekly() === '') {
      this.error.set(this.i18n.t('errors.pricing.required'));
      return;
    }
    if (Number(this.weekly()) <= 0) {
      this.error.set(this.i18n.t('errors.pricing.amount'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.#rateCard.defineSeason({
        villaId: this.villaId,
        from: this.from(),
        to: this.to(),
        weeklyAmount: Number(this.weekly()),
      });
      this.saved.set(true);
      this.from.set('');
      this.to.set('');
      this.weekly.set('');
      await this.load();
    } catch (cause) {
      this.error.set(this.message(cause, 'errors.pricing.save'));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(season: SeasonRow): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      await this.#rateCard.removeSeason(this.villaId, season.seasonId);
      await this.load();
    } catch (cause) {
      this.error.set(this.message(cause, 'errors.pricing.save'));
    } finally {
      this.busy.set(false);
    }
  }
}
