import { Component, inject, signal } from "@angular/core"
import { ActivatedRoute, RouterLink } from "@angular/router"
import { Auth } from "../core/auth.service"

/** The verification link lands here with a token; it is POSTed immediately. */
@Component({
  selector: "app-verify-email",
  imports: [RouterLink],
  template: `
    <main class="auth">
      <h1>Vérification de votre e-mail</h1>
      @if (state() === "pending") {
        <p>Vérification en cours…</p>
      } @else if (state() === "ok") {
        <p class="ok">Votre adresse e-mail est vérifiée.</p>
        <p><a routerLink="/connexion">Se connecter</a></p>
      } @else {
        <p class="error">Ce lien est invalide ou a expiré.</p>
        <p><a routerLink="/connexion">Retour à la connexion</a></p>
      }
    </main>
  `,
  styles: `
    .auth { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; }
    .error { color: #b3261e; }
    .ok { color: #0d5c4d; }
  `,
})
export class VerifyEmailPage implements OnInitLike {
  readonly #route = inject(ActivatedRoute)
  readonly #auth = inject(Auth)
  readonly state = signal<"pending" | "ok" | "failed">("pending")

  ngOnInitLike(): void {
    const token = this.#route.snapshot.queryParamMap.get("token") ?? ""
    this.#auth
      .verifyEmail(token)
      .then(() => this.state.set("ok"))
      .catch(() => this.state.set("failed"))
  }
}

interface OnInitLike {
  ngOnInitLike(): void
}
