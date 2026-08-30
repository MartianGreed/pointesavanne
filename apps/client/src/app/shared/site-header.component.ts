import { Component, computed, inject, signal } from "@angular/core"
import { NavigationEnd, Router, RouterLink } from "@angular/router"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { filter } from "rxjs"
import { Auth } from "../core/auth.service"

type HeaderVariant = "overlay" | "solid" | "owner"

/**
 * The site header, straight from the design: transparent and laid over the
 * hero on the home page, on the deep-green bar everywhere else, with a
 * dedicated owner variant for the admin area.
 */
@Component({
  selector: "app-site-header",
  imports: [RouterLink],
  template: `
    <header class="site-header" [class.overlay]="variant() === 'overlay'">
      <div class="header-inner">
        <a routerLink="/" class="brand">
          <img src="logo.png" alt="" />
          <span class="brand-text">
            <span class="brand-name">VILLA DU CASSIER JAUNE</span>
            <span class="brand-sub">{{ variant() === "owner" ? "ESPACE PROPRIÉTAIRE" : "MARTINIQUE" }}</span>
          </span>
        </a>

        @if (variant() === "owner") {
          <nav class="nav">
            <a routerLink="/" class="nav-link">Voir le site</a>
            <a routerLink="/espace-client" class="nav-link">Vue client</a>
            <button type="button" class="btn-ghost nav-cta" (click)="signOut()">Déconnexion</button>
          </nav>
        } @else {
          <nav class="nav">
            <a routerLink="/" fragment="villa" class="nav-link">La villa</a>
            <a routerLink="/galerie" class="nav-link" [class.active]="active() === 'photos'">Photos</a>
            @if (variant() === "overlay") {
              <a routerLink="/" fragment="equipements" class="nav-link">Équipements</a>
            }
            <a routerLink="/" fragment="tarifs" class="nav-link">Tarifs</a>
            <a routerLink="/" fragment="reservation" class="nav-link">Réservation</a>
            @if (auth.signedIn()) {
              <a routerLink="/espace-client" class="nav-link" [class.active]="active() === 'espace'">Mon espace</a>
              <button type="button" class="btn-ghost nav-cta" (click)="signOut()">Déconnexion</button>
            } @else {
              <a routerLink="/connexion" class="nav-link" [class.active]="active() === 'connexion'">Connexion</a>
            }
            @if (active() === "devis") {
              <span class="nav-current">Demander un devis</span>
            } @else {
              <a routerLink="/devis" class="btn nav-cta">Demander un devis</a>
            }
          </nav>
        }
      </div>
    </header>
  `,
  styles: `
    .site-header {
      background: var(--green-deep);
      position: relative;
      z-index: 30;
    }
    .site-header.overlay {
      position: absolute;
      inset: 0 0 auto 0;
      background: transparent;
    }
    .header-inner {
      max-width: 1240px;
      margin: 0 auto;
      padding: 26px 40px;
      display: flex;
      align-items: center;
      gap: 40px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand img {
      width: 52px;
      height: 30px;
      object-fit: contain;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .brand-name {
      font-family: var(--serif);
      font-size: 19px;
      letter-spacing: 0.14em;
      color: #ffffff;
      line-height: 1;
    }
    .brand-sub {
      font-size: 9.5px;
      letter-spacing: 0.3em;
      color: rgba(255, 255, 255, 0.62);
    }
    .nav {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 26px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .nav-link {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      white-space: nowrap;
    }
    .nav-link:hover {
      color: #ffffff;
    }
    .nav-link.active {
      color: #ffffff;
      border-bottom: 1.5px solid var(--accent);
      padding-bottom: 3px;
    }
    .nav-cta {
      padding: 12px 22px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }
    .btn-ghost {
      border: none;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.22);
    }
    .nav-current {
      padding: 12px 22px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }
    @media (max-width: 1000px) {
      .header-inner {
        gap: 20px;
        padding: 18px 24px;
      }
      .nav {
        gap: 16px;
      }
    }
    @media (max-width: 720px) {
      .header-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .nav {
        margin-left: 0;
        justify-content: flex-start;
      }
    }
  `,
})
export class SiteHeader {
  readonly auth = inject(Auth)
  readonly #router = inject(Router)

  readonly path = signal(this.#router.url)

  readonly variant = computed<HeaderVariant>(() => {
    const p = this.path().split("?")[0]!.split("#")[0]!
    if (p.startsWith("/proprietaire")) return "owner"
    return p === "/" || p === "" ? "overlay" : "solid"
  })

  readonly active = computed(() => {
    const p = this.path().split("?")[0]!.split("#")[0]!
    if (p.startsWith("/galerie")) return "photos"
    if (p.startsWith("/connexion") || p.startsWith("/inscription")) return "connexion"
    if (p.startsWith("/espace-client")) return "espace"
    if (p.startsWith("/devis")) return "devis"
    return ""
  })

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.path.set(event.urlAfterRedirects))
  }

  async signOut(): Promise<void> {
    await this.auth.signOut()
    await this.#router.navigate(["/"])
  }
}
