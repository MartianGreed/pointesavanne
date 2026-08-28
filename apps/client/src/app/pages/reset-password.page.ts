import { Component, inject, signal } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { ActivatedRoute, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

@Component({
  selector: "app-reset-password",
  imports: [FormsModule, RouterLink],
  template: `
    <main class="auth">
      <h1>Nouveau mot de passe</h1>
      @if (done()) {
        <p class="ok">Votre mot de passe est modifié.</p>
        <p><a routerLink="/connexion">Se connecter</a></p>
      } @else {
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <form #f="ngForm" (ngSubmit)="submit()">
          <label>
            Nouveau mot de passe (8 caractères minimum)
            <input type="password" name="password" [(ngModel)]="password" required minlength="8" />
          </label>
          <button type="submit" [disabled]="f.invalid || busy()">Enregistrer</button>
        </form>
      }
    </main>
  `,
  styles: `
    .auth { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; }
    label { display: block; margin-bottom: 1rem; }
    input { display: block; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
    .error { color: #b3261e; }
    .ok { color: #0d5c4d; }
  `,
})
export class ResetPasswordPage {
  readonly #route = inject(ActivatedRoute)
  readonly #auth = inject(Auth)
  password = ""
  readonly busy = signal(false)
  readonly done = signal(false)
  readonly error = signal("")

  async submit(): Promise<void> {
    this.busy.set(true)
    this.error.set("")
    try {
      const token = this.#route.snapshot.queryParamMap.get("token") ?? ""
      await this.#auth.completePasswordReset(token, this.password)
      this.done.set(true)
    } catch {
      this.error.set("Ce lien est invalide ou a expiré.")
    } finally {
      this.busy.set(false)
    }
  }
}
