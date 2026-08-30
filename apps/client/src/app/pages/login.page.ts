import { Component, afterNextRender, inject, signal } from "@angular/core"
import { Router, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"
import { ApiError } from "../core/api"
import { passkeysSupported } from "../core/passkey"
import { passkeyErrorMessage } from "../core/passkey-errors"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = "connexion" | "inscription"

/**
 * The auth page from the design: an image panel beside a card that toggles
 * between sign-in and registration, both wired to the API's cookie sessions.
 */
@Component({
  selector: "app-login",
  imports: [RouterLink],
  template: `
    <section class="auth-grid">
      <div class="panel">
        <div class="panel-gradient"></div>
        <div class="panel-text">
          <div class="panel-title">Votre séjour commence ici</div>
          <div class="panel-sub">Devis, documents et suivi de réservation, réunis dans votre espace client.</div>
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
            Connexion
          </button>
          <button
            type="button"
            class="tab tab-right"
            [class.active]="mode() === 'inscription'"
            (click)="versInscription()"
          >
            Créer un compte
          </button>
        </div>

        <h1 class="title">{{ mode() === "connexion" ? "Heureux de vous revoir" : "Créez votre compte" }}</h1>
        <p class="subtitle">
          @{{
            mode() === "connexion"
              ? "Accédez à vos devis, documents et réservations."
              : "Une minute suffit : votre compte vous permet de suivre votre demande de devis et votre réservation."
          }}
        </p>

        <div class="fields">
          @if (mode() === "inscription") {
            <div class="row-2">
              <label class="field">
                <span class="field-label">Prénom</span>
                <input type="text" [value]="prenom()" (input)="set('prenom', $event)" placeholder="Marie" />
              </label>
              <label class="field">
                <span class="field-label">Nom</span>
                <input type="text" [value]="nom()" (input)="set('nom', $event)" placeholder="Dupont" />
              </label>
            </div>
          }
          <label class="field">
            <span class="field-label">E-mail</span>
            <input
              type="email"
              [value]="email()"
              (input)="set('email', $event)"
              placeholder="marie.dupont@mail.com"
              autocomplete="email"
            />
          </label>
          <label class="field">
            <span class="field-label">Mot de passe</span>
            <input
              type="password"
              [value]="mdp()"
              (input)="set('mdp', $event)"
              placeholder="••••••••"
              [autocomplete]="mode() === 'connexion' ? 'current-password' : 'new-password'"
            />
          </label>
          @if (mode() === "inscription") {
            <label class="field">
              <span class="field-label">Confirmer le mot de passe</span>
              <input
                type="password"
                [value]="mdp2()"
                (input)="set('mdp2', $event)"
                placeholder="••••••••"
                autocomplete="new-password"
              />
            </label>
          }
          @if (mode() === "connexion") {
            <div class="forgot">
              <a routerLink="/mot-de-passe/oublie">Mot de passe oublié ?</a>
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
          {{ mode() === "connexion" ? "Se connecter" : "Créer mon compte" }}
        </button>

        @if (mode() === "connexion" && passkeyOk()) {
          <div class="divider"><span>ou</span></div>
          <button type="button" class="passkey-btn" (click)="connexionPasskey()" [disabled]="busy()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="8" cy="15" r="4.2"></circle>
              <path d="M10.8 12.2L21 2M16 7l3 3M13 10l2 2"></path>
            </svg>
            Se connecter avec une clé d'accès
          </button>
          <p class="passkey-hint">Sans mot de passe, avec Face ID, Touch ID ou votre clé de sécurité.</p>
        }

        <p class="terms">
          En continuant, vous acceptez nos
          <a routerLink="/">conditions d'utilisation</a> et notre politique de confidentialité.
        </p>
        <p class="owner-hint">
          Vous êtes le propriétaire ?
          <a routerLink="/proprietaire/reservations">Accéder à l'espace de gestion</a>
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
      background-image: url("/images/hamac-carbet.jpg");
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
      content: "";
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
    .owner-hint {
      font-size: 12.5px;
      color: var(--muted-2);
      margin: 12px 0 0;
      text-align: center;
    }
    .owner-hint a {
      font-size: 12.5px;
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
  readonly #auth = inject(Auth)
  readonly #router = inject(Router)

  readonly mode = signal<Mode>("connexion")
  readonly prenom = signal("")
  readonly nom = signal("")
  readonly email = signal("")
  readonly mdp = signal("")
  readonly mdp2 = signal("")
  readonly erreur = signal("")
  readonly info = signal("")
  readonly busy = signal(false)
  /** Set after render so SSR and hydration agree on the initial markup. */
  readonly passkeyOk = signal(false)

  constructor() {
    afterNextRender(() => this.passkeyOk.set(passkeysSupported()))
  }

  versConnexion(): void {
    this.mode.set("connexion")
    this.erreur.set("")
    this.info.set("")
  }

  versInscription(): void {
    this.mode.set("inscription")
    this.erreur.set("")
    this.info.set("")
  }

  set(key: "prenom" | "nom" | "email" | "mdp" | "mdp2", event: Event): void {
    this[key].set((event.target as HTMLInputElement).value)
    this.erreur.set("")
  }

  async soumettre(): Promise<void> {
    if (this.mode() === "connexion") {
      if (!EMAIL_PATTERN.test(this.email())) {
        this.erreur.set("Saisissez une adresse e-mail valide.")
        return
      }
      if (this.mdp() === "") {
        this.erreur.set("Saisissez votre mot de passe.")
        return
      }
      await this.seConnecter()
    } else {
      if (this.prenom() === "" || this.nom() === "") {
        this.erreur.set("Renseignez votre prénom et votre nom.")
        return
      }
      if (!EMAIL_PATTERN.test(this.email())) {
        this.erreur.set("Saisissez une adresse e-mail valide.")
        return
      }
      if (this.mdp().length < 8) {
        this.erreur.set("Le mot de passe doit contenir au moins 8 caractères.")
        return
      }
      if (this.mdp() !== this.mdp2()) {
        this.erreur.set("Les deux mots de passe ne correspondent pas.")
        return
      }
      await this.creerCompte()
    }
  }

  /** Passkey sign-in: uses the typed e-mail when present, discoverable otherwise. */
  async connexionPasskey(): Promise<void> {
    this.busy.set(true)
    this.erreur.set("")
    try {
      const email = this.email().trim()
      await this.#auth.signInWithPasskey(email === "" ? undefined : email)
      await this.#router.navigate(["/espace-client"])
    } catch (e) {
      this.erreur.set(passkeyErrorMessage(e, "Connexion par clé d'accès impossible."))
    } finally {
      this.busy.set(false)
    }
  }

  private async seConnecter(): Promise<void> {
    this.busy.set(true)
    this.erreur.set("")
    try {
      await this.#auth.signIn(this.email(), this.mdp())
      await this.#router.navigate(["/espace-client"])
    } catch (e) {
      if (e instanceof ApiError && e.problem.error === "EmailNotVerified") {
        this.erreur.set("Votre adresse e-mail n'est pas encore vérifiée. Suivez le lien reçu par e-mail, puis reconnectez-vous.")
      } else {
        this.erreur.set("Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.")
      }
    } finally {
      this.busy.set(false)
    }
  }

  private async creerCompte(): Promise<void> {
    this.busy.set(true)
    this.erreur.set("")
    try {
      await this.#auth.register({
        email: this.email(),
        password: this.mdp(),
        firstname: this.prenom(),
        lastname: this.nom(),
        phoneNumber: "",
      })
      this.info.set(
        `Votre compte a bien été créé, ${this.prenom()}. Un e-mail de confirmation vient de vous être envoyé : suivez le lien qu'il contient puis connectez-vous. Après votre première connexion, vous pourrez enregistrer une clé d'accès pour vous connecter sans mot de passe.`,
      )
    } catch (e) {
      const problem = e as { problem?: { issues?: string[]; message?: string } }
      this.erreur.set(problem.problem?.issues?.[0] ?? problem.problem?.message ?? "Inscription impossible.")
    } finally {
      this.busy.set(false)
    }
  }
}
