import { Component, inject } from "@angular/core"
import { RouterLink, RouterOutlet } from "@angular/router"
import { Auth } from "./core/auth.service"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="nav">
      <a routerLink="/" class="brand">Villa Pointe Savanne</a>
      <div class="links">
        <a routerLink="/devis">Demander un devis</a>
        @if (auth.signedIn()) {
          <a routerLink="/espace-client">Mon espace</a>
          <a routerLink="/proprietaire/reservations">Réservations</a>
        } @else {
          <a routerLink="/connexion">Connexion</a>
        }
      </div>
    </nav>
    <router-outlet />
  `,
  styles: `
    .nav {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.9rem 2rem; border-bottom: 1px solid #eee;
    }
    .brand { font-weight: 700; color: #0d5c4d; text-decoration: none; }
    .links { display: flex; gap: 1.25rem; }
    .links a { color: #333; text-decoration: none; }
  `,
})
export class App {
  readonly auth = inject(Auth)

  constructor() {
    void this.auth.refresh()
  }
}
