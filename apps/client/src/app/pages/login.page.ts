import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

@Component({
  selector: "app-login",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="auth">
      <h1>Connexion</h1>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <form #f="ngForm" (ngSubmit)="submit()">
        <label>
          E-mail
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label>
          Mot de passe
          <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
        </label>
        <button type="submit" [disabled]="f.invalid || busy()">Se connecter</button>
      </form>
      <p>
        <a routerLink="/mot-de-passe/oublie">Mot de passe oublié ?</a> —
        <a routerLink="/inscription">Créer un compte</a>
      </p>
    </main>
  `,
  styles: `
    .auth { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; }
    label { display: block; margin-bottom: 1rem; }
    input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    button { padding: 0.6rem 1.4rem; }
    .error { color: #b3261e; }
  `,
})
export class LoginPage {
  readonly #auth = inject(Auth)
  readonly #router = inject(Router)

  email = ""
  password = ""
  readonly busy = signal(false)
  readonly error = signal("")

  async submit(): Promise<void> {
    this.busy.set(true)
    this.error.set("")
    try {
      await this.#auth.signIn(this.email, this.password)
      await this.#router.navigate(["/espace-client"])
    } catch (e) {
      this.error.set("Identifiants invalides.")
    } finally {
      this.busy.set(false)
    }
  }
}
