import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

@Component({
  selector: "app-forgot-password",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="auth">
      <h1>Mot de passe oublié</h1>
      @if (done()) {
        <p class="ok">
          Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.
        </p>
        <p><a routerLink="/connexion">Retour à la connexion</a></p>
      } @else {
        <form #f="ngForm" (ngSubmit)="submit()">
          <label>
            E-mail
            <input type="email" name="email" [(ngModel)]="email" required />
          </label>
          <button type="submit" [disabled]="f.invalid || busy()">Envoyer le lien</button>
        </form>
      }
    </main>
  `,
  styles: `
    .auth { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; }
    label { display: block; margin-bottom: 1rem; }
    input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    .ok { color: #0d5c4d; }
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
