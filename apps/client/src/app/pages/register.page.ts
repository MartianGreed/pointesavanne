import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

@Component({
  selector: "app-register",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="auth">
      <h1>Créer un compte</h1>
      @if (done()) {
        <p class="ok">
          Votre compte est créé. Un e-mail de vérification vous a été envoyé —
          cliquez sur le lien qu'il contient, puis <a routerLink="/connexion">connectez-vous</a>.
        </p>
      } @else {
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <form #f="ngForm" (ngSubmit)="submit()">
          <label>Prénom <input name="firstname" [(ngModel)]="firstname" required /></label>
          <label>Nom <input name="lastname" [(ngModel)]="lastname" required /></label>
          <label>E-mail <input type="email" name="email" [(ngModel)]="email" required /></label>
          <label>Téléphone <input name="phone" [(ngModel)]="phone" required /></label>
          <label>
            Mot de passe (8 caractères minimum)
            <input type="password" name="password" [(ngModel)]="password" required minlength="8" />
          </label>
          <button type="submit" [disabled]="f.invalid || busy()">Créer mon compte</button>
        </form>
        <p><a routerLink="/connexion">J'ai déjà un compte</a></p>
      }
    </main>
  `,
  styles: `
    .auth { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; }
    label { display: block; margin-bottom: 1rem; }
    input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    button { padding: 0.6rem 1.4rem; }
    .error { color: #b3261e; }
    .ok { color: #0d5c4d; }
  `,
})
export class RegisterPage {
  readonly #auth = inject(Auth)
  readonly #router = inject(Router)

  firstname = ""
  lastname = ""
  email = ""
  phone = ""
  password = ""
  readonly busy = signal(false)
  readonly done = signal(false)
  readonly error = signal("")

  async submit(): Promise<void> {
    this.busy.set(true)
    this.error.set("")
    try {
      await this.#auth.register({
        email: this.email,
        password: this.password,
        firstname: this.firstname,
        lastname: this.lastname,
        phoneNumber: this.phone,
      })
      this.done.set(true)
    } catch (e) {
      const problem = e as { problem?: { issues?: string[]; message?: string } }
      this.error.set(problem.problem?.issues?.[0] ?? problem.problem?.message ?? "Inscription impossible.")
    } finally {
      this.busy.set(false)
    }
  }
}
