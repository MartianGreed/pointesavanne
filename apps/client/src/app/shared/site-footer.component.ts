import { Component, computed, inject, signal } from "@angular/core"
import { NavigationEnd, Router, RouterLink } from "@angular/router"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { filter } from "rxjs"

type FooterVariant = "home" | "compact" | "owner"

/** The deep-green footer box: full nav on the home page, compact elsewhere. */
@Component({
  selector: "app-site-footer",
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      @if (variant() === "home") {
        <div class="footer-box">
          <div class="top">
            <a routerLink="/" class="brand">
              <img src="logo.png" alt="" />
              <span class="brand-text">
                <span class="brand-name">VILLA DU CASSIER JAUNE</span>
                <span class="brand-sub">MARTINIQUE</span>
              </span>
            </a>
            <nav class="links">
              <a routerLink="/" fragment="villa">La villa</a>
              <a routerLink="/galerie">Photos</a>
              <a routerLink="/" fragment="equipements">Équipements</a>
              <a routerLink="/" fragment="tarifs">Tarifs</a>
              <a routerLink="/devis">Demander un devis</a>
              <a routerLink="/espace-client">Espace client</a>
            </nav>
          </div>
          <div class="bottom">
            <span>© 2025 Villa du Cassier Jaune – Tous droits réservés</span>
            <span class="legal">
              <a routerLink="/" fragment="top">Mentions légales</a>
              <a routerLink="/" fragment="top">Confidentialité</a>
            </span>
          </div>
        </div>
      } @else if (variant() === "owner") {
        <div class="footer-box slim">
          <span>© 2026 Villa du Cassier Jaune – Espace propriétaire</span>
          <span class="legal">
            <a routerLink="/">Voir le site</a>
            <a routerLink="/espace-client">Vue client</a>
          </span>
        </div>
      } @else {
        <div class="footer-box slim">
          <span>© 2026 Villa du Cassier Jaune – Tous droits réservés</span>
          <span class="legal">
            <a routerLink="/">Retour à l'accueil</a>
            <a routerLink="/devis">Demander un devis</a>
          </span>
        </div>
      }
    </footer>
  `,
  styles: `
    .site-footer {
      max-width: 1240px;
      margin: 24px auto 40px;
      padding: 0 40px;
    }
    .footer-box {
      background: var(--green-deep);
      border-radius: 8px;
      padding: 26px 34px;
    }
    .footer-box.slim {
      padding: 22px 34px;
      display: flex;
      align-items: center;
      gap: 34px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
    .top {
      display: flex;
      align-items: center;
      gap: 32px;
      flex-wrap: wrap;
      padding-bottom: 22px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 13px;
    }
    .brand img {
      width: 46px;
      height: 27px;
      object-fit: contain;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .brand-name {
      font-family: var(--serif);
      font-size: 16px;
      letter-spacing: 0.14em;
      color: #ffffff;
      line-height: 1;
    }
    .brand-sub {
      font-size: 8.5px;
      letter-spacing: 0.3em;
      color: rgba(255, 255, 255, 0.55);
    }
    .links {
      display: flex;
      align-items: center;
      gap: 26px;
      flex-wrap: wrap;
    }
    .links a {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.86);
      white-space: nowrap;
    }
    .links a:hover {
      color: #ffffff;
    }
    .bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.14);
      padding-top: 18px;
      display: flex;
      align-items: center;
      gap: 34px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
    .legal {
      margin-left: auto;
      display: flex;
      gap: 34px;
    }
    .legal a {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
    .legal a:hover {
      color: #ffffff;
    }
    @media (max-width: 900px) {
      .site-footer {
        padding: 0 24px;
      }
      .footer-box,
      .footer-box.slim {
        padding: 20px 22px;
      }
      .footer-box.slim,
      .bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .legal {
        margin-left: 0;
        gap: 20px;
      }
    }
  `,
})
export class SiteFooter {
  readonly #router = inject(Router)
  readonly path = signal(this.#router.url)

  readonly variant = computed<FooterVariant>(() => {
    const p = this.path().split("?")[0]!.split("#")[0]!
    if (p.startsWith("/proprietaire")) return "owner"
    return p === "/" || p === "" ? "home" : "compact"
  })

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.path.set(event.urlAfterRedirects))
  }
}
