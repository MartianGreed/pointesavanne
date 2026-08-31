import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth.service';
import { BookingService } from '../core/booking.service';
import { Internationalization } from '../core/internationalization';
import { passkeysSupported } from '../core/passkey';
import { passkeyErrorMessage } from '../core/passkey-errors';
import { QuoteFunnelStore } from '../core/quote-funnel.store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'connexion' | 'inscription';

/**
 * The auth page from the design: an image panel beside a card that toggles
 * between sign-in and registration, both wired to the API's cookie sessions.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="auth-grid">
      <div class="panel">
        <div class="panel-gradient"></div>
        <div class="panel-text">
          <div class="panel-title">{{ i18n.t('login.panel.title') }}</div>
          <div class="panel-sub">{{ i18n.t('login.panel.subtitle') }}</div>
        </div>
      </div>

      <div class="form-card">
        <div class="tabs">
          <button
            type="button"
            class="tab"
            [class.active]="mode() === 'connexion'"
            (click)="versConnexion()"
          >
            {{ i18n.t('navigation.signIn') }}
          </button>
          <button
            type="button"
            class="tab tab-right"
            [class.active]="mode() === 'inscription'"
            (click)="versInscription()"
          >
            {{ i18n.t('login.createAccount') }}
          </button>
        </div>

        <h1 class="title">
          {{ i18n.t(mode() === 'connexion' ? 'login.signIn.title' : 'login.register.title') }}
        </h1>
        <p class="subtitle">
          {{ i18n.t(mode() === 'connexion' ? 'login.signIn.subtitle' : 'login.register.subtitle') }}
        </p>

        <div class="fields">
          @if (mode() === 'inscription') {
            <div class="row-2">
              <label class="field">
                <span class="field-label">{{ i18n.t('fields.firstname') }}</span>
                <input
                  type="text"
                  [value]="prenom()"
                  (input)="set('prenom', $event)"
                  [placeholder]="i18n.t('placeholders.firstname')"
                />
              </label>
              <label class="field">
                <span class="field-label">{{ i18n.t('fields.lastname') }}</span>
                <input
                  type="text"
                  [value]="nom()"
                  (input)="set('nom', $event)"
                  [placeholder]="i18n.t('placeholders.lastname')"
                />
              </label>
            </div>
          }
          <label class="field">
            <span class="field-label">{{ i18n.t('fields.email') }}</span>
            <input
              type="email"
              [value]="email()"
              (input)="set('email', $event)"
              [placeholder]="i18n.t('placeholders.email')"
              autocomplete="email"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ i18n.t('fields.password') }}</span>
            <input
              type="password"
              [value]="mdp()"
              (input)="set('mdp', $event)"
              [placeholder]="i18n.t('placeholders.password')"
              [autocomplete]="mode() === 'connexion' ? 'current-password' : 'new-password'"
            />
          </label>
          @if (mode() === 'inscription') {
            <label class="field">
              <span class="field-label">{{ i18n.t('fields.confirmPassword') }}</span>
              <input
                type="password"
                [value]="mdp2()"
                (input)="set('mdp2', $event)"
                [placeholder]="i18n.t('placeholders.password')"
                autocomplete="new-password"
              />
            </label>
          }
          @if (mode() === 'connexion') {
            <div class="forgot">
              <a routerLink="/mot-de-passe/oublie">{{ i18n.t('login.forgotPassword') }}</a>
            </div>
          }
        </div>

        @if (erreur()) {
          <div class="box box-err message">{{ erreur() }}</div>
        }
        @if (info()) {
          <div class="box box-ok message">{{ info() }}</div>
        }

        <button type="button" class="btn btn-lg submit" (click)="soumettre()" [disabled]="busy()">
          {{ i18n.t(mode() === 'connexion' ? 'auth.signIn' : 'login.createMyAccount') }}
        </button>

        @if (mode() === 'connexion' && passkeyOk()) {
          <div class="divider">
            <span>{{ i18n.t('common.or') }}</span>
          </div>
          <button
            type="button"
            class="passkey-btn"
            (click)="connexionPasskey()"
            [disabled]="busy()"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="8" cy="15" r="4.2"></circle>
              <path d="M10.8 12.2L21 2M16 7l3 3M13 10l2 2"></path>
            </svg>
            {{ i18n.t('login.passkey.action') }}
          </button>
          <p class="passkey-hint">{{ i18n.t('login.passkey.hint') }}</p>
        }

        <p class="terms">
          {{ i18n.t('login.terms.before') }}
          <a routerLink="/">{{ i18n.t('login.terms.link') }}</a
          >{{ i18n.t('login.terms.after') }}
        </p>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      flex: 1;
    }
    .auth-grid {
      max-width: 1240px;
      margin: 0 auto;
      padding: 56px 40px 72px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      align-items: stretch;
    }
    .panel {
      position: relative;
      border-radius: 8px 0 0 8px;
      overflow: hidden;
      min-height: 560px;
      background-image: url('/images/hamac-carbet.jpg');
      background-size: cover;
      background-position: center;
    }
    .panel-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(11, 42, 32, 0.05) 40%, rgba(11, 42, 32, 0.72) 100%);
    }
    .panel-text {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 34px 38px;
    }
    .panel-title {
      font-family: var(--serif);
      font-size: 27px;
      color: #ffffff;
      line-height: 1.3;
    }
    .panel-sub {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.82);
      margin-top: 8px;
    }
    .form-card {
      background: #ffffff;
      border: 1px solid var(--line);
      border-left: none;
      border-radius: 0 8px 8px 0;
      padding: 46px 52px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .tabs {
      display: flex;
      border: 1px solid var(--field-border);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .tab {
      flex: 1;
      padding: 13px 0;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      background: #ffffff;
      color: var(--label);
    }
    .tab.tab-right {
      border-left: 1px solid var(--field-border);
    }
    .tab.active {
      background: var(--green);
      color: #ffffff;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 34px;
      line-height: 1.15;
      color: var(--title);
      margin: 0 0 10px;
    }
    .subtitle {
      font-size: 14.5px;
      line-height: 1.65;
      color: var(--muted);
      margin: 0 0 28px;
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .forgot {
      display: flex;
      justify-content: flex-end;
    }
    .forgot a {
      font-size: 13px;
    }
    .message {
      margin-top: 20px;
    }
    .submit {
      margin-top: 26px;
      width: 100%;
    }
    .divider {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 22px;
      color: var(--muted-2);
      font-size: 13px;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--field-border);
    }
    .passkey-btn {
      margin-top: 16px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 0;
      border: 1px solid var(--field-border);
      border-radius: 5px;
      background: #ffffff;
      color: #33443c;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }
    .passkey-btn:hover {
      border-color: var(--green);
      color: var(--green);
    }
    .passkey-btn:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .passkey-hint {
      font-size: 12.5px;
      color: var(--muted-2);
      text-align: center;
      margin: 12px 0 0;
    }
    .terms {
      font-size: 12.5px;
      line-height: 1.6;
      color: var(--muted-2);
      margin: 22px 0 0;
      text-align: center;
    }
    .terms a {
      color: var(--muted);
      text-decoration: underline;
    }
    @media (max-width: 900px) {
      .auth-grid {
        grid-template-columns: 1fr;
        padding: 32px 24px 48px;
      }
      .panel {
        min-height: 260px;
        border-radius: 8px 8px 0 0;
      }
      .form-card {
        border-left: 1px solid var(--line);
        border-radius: 0 0 8px 8px;
        padding: 32px 28px;
      }
      .row-2 {
        grid-template-columns: 1fr;
        gap: 18px;
      }
    }
  `,
})
export class LoginPage {
  readonly i18n = inject(Internationalization);
  readonly #auth = inject(Auth);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #bookings = inject(BookingService);
  readonly #funnel = inject(QuoteFunnelStore);

  readonly mode = signal<Mode>('connexion');
  readonly prenom = signal('');
  readonly nom = signal('');
  readonly email = signal('');
  readonly mdp = signal('');
  readonly mdp2 = signal('');
  readonly erreur = signal('');
  readonly info = signal('');
  readonly busy = signal(false);
  /** Set after render so SSR and hydration agree on the initial markup. */
  readonly passkeyOk = signal(false);

  constructor() {
    afterNextRender(() => {
      this.passkeyOk.set(passkeysSupported());
      // The devis funnel sends the visitor straight to account creation,
      // with the contact details they already typed.
      if (this.#route.snapshot.queryParamMap.get('mode') === 'inscription') {
        this.mode.set('inscription');
      }
      const contact = this.#funnel.contact();
      if (contact.prenom !== '') this.prenom.set(contact.prenom);
      if (contact.nom !== '') this.nom.set(contact.nom);
      if (contact.email !== '') this.email.set(contact.email);
    });
  }

  versConnexion(): void {
    this.mode.set('connexion');
    this.erreur.set('');
    this.info.set('');
  }

  versInscription(): void {
    this.mode.set('inscription');
    this.erreur.set('');
    this.info.set('');
  }

  set(key: 'prenom' | 'nom' | 'email' | 'mdp' | 'mdp2', event: Event): void {
    this[key].set((event.target as HTMLInputElement).value);
    this.erreur.set('');
  }

  async soumettre(): Promise<void> {
    if (this.mode() === 'connexion') {
      if (!EMAIL_PATTERN.test(this.email())) {
        this.erreur.set(this.i18n.t('errors.validation.email'));
        return;
      }
      if (this.mdp() === '') {
        this.erreur.set(this.i18n.t('errors.validation.passwordRequired'));
        return;
      }
      await this.seConnecter();
    } else {
      if (this.prenom() === '' || this.nom() === '') {
        this.erreur.set(this.i18n.t('errors.validation.nameRequired'));
        return;
      }
      if (!EMAIL_PATTERN.test(this.email())) {
        this.erreur.set(this.i18n.t('errors.validation.email'));
        return;
      }
      if (this.mdp().length < 8) {
        this.erreur.set(this.i18n.t('errors.validation.passwordLength'));
        return;
      }
      if (this.mdp() !== this.mdp2()) {
        this.erreur.set(this.i18n.t('errors.validation.passwordMismatch'));
        return;
      }
      await this.creerCompte();
    }
  }

  /** Passkey sign-in: uses the typed e-mail when present, discoverable otherwise. */
  async connexionPasskey(): Promise<void> {
    this.busy.set(true);
    this.erreur.set('');
    try {
      const email = this.email().trim();
      await this.#auth.signInWithPasskey(email === '' ? undefined : email);
      await this.apresConnexion();
    } catch (e) {
      this.erreur.set(passkeyErrorMessage(e, this.i18n, 'errors.passkey.signIn'));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Post-sign-in destination. The claim runs first — it converts any
   * quotation lead the visitor left into a real request (nothing to do for
   * most sign-ins) — then a converted lead goes straight to the customer
   * area where the request is waiting, owners to their console.
   */
  private async apresConnexion(): Promise<void> {
    let converted = false;
    try {
      const outcome = await this.#bookings.claimLeads();
      this.#funnel.recordClaim(outcome);
      converted = outcome.claimed > 0 && outcome.bookings.length > 0;
    } catch {
      // A failed claim must never block the sign-in; the request can be
      // resent from /devis.
    }
    if (converted) {
      await this.#router.navigate(['/espace-client']);
      return;
    }
    await this.#router.navigate([
      this.#auth.isOwner() ? '/proprietaire/reservations' : '/espace-client',
    ]);
  }

  private async seConnecter(): Promise<void> {
    this.busy.set(true);
    this.erreur.set('');
    try {
      await this.#auth.signIn(this.email(), this.mdp());
      await this.apresConnexion();
    } catch (cause) {
      this.erreur.set(this.i18n.error(cause, 'errors.backend.invalidCredentials'));
    } finally {
      this.busy.set(false);
    }
  }

  private async creerCompte(): Promise<void> {
    this.busy.set(true);
    this.erreur.set('');
    try {
      await this.#auth.register({
        email: this.email(),
        password: this.mdp(),
        firstname: this.prenom(),
        lastname: this.nom(),
        phoneNumber: '',
      });
      this.info.set(
        this.#funnel.pendingLead()
          ? this.i18n.t('login.register.pendingLeadSuccess', { firstname: this.prenom() })
          : this.i18n.t('login.register.success', { firstname: this.prenom() }),
      );
    } catch (cause) {
      this.erreur.set(this.i18n.error(cause, 'errors.auth.registration'));
    } finally {
      this.busy.set(false);
    }
  }
}
