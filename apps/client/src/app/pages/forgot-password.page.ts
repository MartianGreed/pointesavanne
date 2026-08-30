import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

@Component({
  selector: "app-forgot-password",
  imports: [FormsModule, RouterLink],
  template: `
    <section class="wrap">
      <div class="card">
        <h1 class="title">Mot de passe oublié</h1>
        @if (done()) {
          <p class="ok">
            Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.
          </p>
          <a routerLink="/connexion" class="btn btn-md">Retour à la connexion</a>
        } @else {
          <p class="intro">Saisissez votre adresse e-mail : nous vous enverrons un lien de réinitialisation.</p>
          <form #f="ngForm" (ngSubmit)="submit()" class="form">
            <label class="field">
              <span class="field-label">E-mail</span>
              <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
            </label>
            <button type="submit" class="btn btn-md" [disabled]="f.invalid || busy()">Envoyer le lien</button>
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    .wrap {
      max-width: 480px;
      margin: 0 auto;
      padding: 56px 24px 72px;
    }
    .card {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 36px 38px;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 32px;
      color: var(--title);
      margin: 0 0 14px;
    }
    .intro {
      font-size: 14.5px;
      line-height: 1.65;
      color: var(--muted);
      margin: 0 0 24px;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .ok {
      font-size: 14px;
      line-height: 1.65;
      color: var(--ok-ink);
      background: var(--ok-bg);
      border-radius: 5px;
      padding: 14px 16px;
      margin: 0 0 20px;
    }
  `,
})
export class ForgotPasswordPage {
  readonly #auth = inject(Auth)
  email = ""
  readonly busy = signal(false)
  readonly done = signal(false)

  async submit(): Promise<void> {
    this.busy.set(true)
    try {
      await this.#auth.requestPasswordReset(this.email)
      this.done.set(true)
    } finally {
      this.busy.set(false)
    }
  }
}
