import { Component, inject, signal } from "@angular/core"
import { Router, RouterLink } from "@angular/router"
import { nightsBetween, stayQueryParams } from "../core/form-state"
import { writeStay } from "../core/form-storage"
import { WEEKLY_BASE } from "../shared/estimate"

interface DispoMessage {
  readonly text: string
  readonly ok: boolean
}

interface PriceCard {
  readonly icon: "tag" | "percent" | "spray" | "shield"
  readonly top?: string
  readonly big: string
  readonly sub?: string
}

interface Step {
  readonly icon: "user" | "calendar" | "document" | "check"
  readonly text: string
}

/** The marketing home: hero, availability search, villa, rates, booking flow. */
@Component({
  selector: "app-home",
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-gradient"></div>
      <div class="container hero-content" id="top">
        <div class="hero-kicker">MARTINIQUE</div>
        <h1 class="hero-title">Une villa de caractère<br />pour vos séjours en Martinique</h1>
        <p class="hero-text">
          Villa de plain-pied avec piscine privée et quatre chambres climatisées.
          Jusqu'à 8 voyageurs, de mars à décembre.
        </p>
        <div class="hero-ctas">
          <a routerLink="/devis" class="btn btn-lg">Demander un devis</a>
          <a routerLink="/" fragment="villa" class="hero-link">Découvrir la villa</a>
        </div>
      </div>
    </section>

    <section class="container search-wrap">
      <div class="search-card">
        <label class="search-field">
          <span class="search-label">Arrivée</span>
          <span class="search-input-wrap">
            <svg viewBox="0 0 20 20" class="input-icon" fill="none" stroke="#8B9A92" stroke-width="1.4">
              <rect x="2.5" y="4" width="15" height="13" rx="1.6"></rect>
              <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3"></path>
            </svg>
            <input type="date" [value]="arrivee()" (change)="onArrivee($event)" />
          </span>
        </label>
        <label class="search-field">
          <span class="search-label">Départ</span>
          <span class="search-input-wrap">
            <svg viewBox="0 0 20 20" class="input-icon" fill="none" stroke="#8B9A92" stroke-width="1.4">
              <rect x="2.5" y="4" width="15" height="13" rx="1.6"></rect>
              <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3"></path>
            </svg>
            <input type="date" [value]="depart()" (change)="onDepart($event)" />
          </span>
        </label>
        <label class="search-field">
          <span class="search-label">Voyageurs</span>
          <span class="search-input-wrap">
            <svg viewBox="0 0 20 20" class="input-icon" fill="none" stroke="#8B9A92" stroke-width="1.4">
              <circle cx="10" cy="7" r="3"></circle>
              <path d="M4.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5"></path>
            </svg>
            <select [value]="voyageurs()" (change)="onVoyageurs($event)">
              @for (n of [2, 3, 4, 5, 6, 7, 8]; track n) {
                <option [value]="n">{{ n }} voyageurs</option>
              }
            </select>
            <svg viewBox="0 0 20 20" class="select-caret" fill="none" stroke="#55665E" stroke-width="1.4">
              <path d="M5 8l5 5 5-5"></path>
            </svg>
          </span>
        </label>
        <button type="button" class="btn btn-md search-button" (click)="allerAuDevis()">
          Vérifier les disponibilités
        </button>
      </div>
      <div class="dispo-slot">
        @if (dispo(); as d) {
          <div class="dispo" [class.err]="!d.ok">{{ d.text }}</div>
        }
      </div>
    </section>

    <section id="equipements" class="container features">
      <div class="features-grid">
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
            <circle cx="9" cy="8" r="3.2"></circle>
            <path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6"></path>
            <circle cx="17" cy="9" r="2.4"></circle>
            <path d="M16 14.4c2.9 0 5 2.3 5 5.6"></path>
          </svg>
          <span>8 voyageurs</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
            <path d="M2.5 18v-6.5h19V18M2.5 14.5h19M6 11.5V8h12v3.5M2.5 18v2M21.5 18v2"></path>
          </svg>
          <span>4 chambres</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
            <path d="M8 13V5h8M8 9h8"></path>
            <path d="M2 16c1.6 0 1.6 1.4 3.3 1.4S6.9 16 8.5 16s1.6 1.4 3.3 1.4S13.4 16 15 16s1.6 1.4 3.3 1.4S19.9 16 21.5 16"></path>
            <path d="M2 20c1.6 0 1.6 1.4 3.3 1.4S6.9 20 8.5 20s1.6 1.4 3.3 1.4S13.4 20 15 20s1.6 1.4 3.3 1.4S19.9 20 21.5 20"></path>
          </svg>
          <span>Piscine privée</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
            <path d="M4 20c0-8 6-14 16-14 0 10-6 14-12 14H4z"></path>
            <path d="M6 18c3-4 7-7 11-8"></path>
          </svg>
          <span>Jardin clos</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
            <path d="M3 17v-4.2L5.2 8h13.6L21 12.8V17"></path>
            <path d="M3 12.8h18M6.5 17v2M17.5 17v2"></path>
            <circle cx="7.5" cy="14.6" r="0.9"></circle>
            <circle cx="16.5" cy="14.6" r="0.9"></circle>
          </svg>
          <span>Parking privé</span>
        </div>
      </div>
    </section>

    <section id="villa" class="container villa-section">
      <div class="villa-box">
        <div class="villa-text">
          <h2 class="villa-title">Le confort d'une maison,<br />au calme sous les tropiques</h2>
          <p class="villa-paragraph">
            Pensée pour les séjours en famille ou entre amis, la villa réunit quatre chambres climatisées,
            de beaux espaces extérieurs et une piscine privée au cœur d'un jardin clos.
          </p>
          <a routerLink="/galerie" class="villa-link">
            Voir toutes les photos
            <svg viewBox="0 0 30 12" width="30" height="12" fill="none" stroke="currentColor" stroke-width="1.3">
              <path d="M0 6h27M22 1.5L27 6l-5 4.5"></path>
            </svg>
          </a>
        </div>
        <div class="villa-images">
          <img src="images/piscine-carbet.jpg" alt="Piscine privée et carbet" class="img-tall" />
          <img src="images/terrasse-couverte.jpg" alt="Terrasse couverte et hamac" />
          <img src="images/chambre-1.jpg" alt="Chambre climatisée" />
        </div>
      </div>
    </section>

    <section id="tarifs" class="container rates-section">
      <div class="rates-box">
        <h2 class="rates-title">Préparez<br />votre séjour</h2>
        <div class="rates-content">
          <div class="rates-grid">
            @for (card of priceCards; track card.big + (card.top ?? "")) {
              <div class="rate-card">
                @switch (card.icon) {
                  @case ("tag") {
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
                      <path d="M12.6 2.5H21v8.4L10.5 21.4 2.6 13.5z"></path>
                      <circle cx="17" cy="7" r="1.4"></circle>
                    </svg>
                  }
                  @case ("percent") {
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
                      <circle cx="12" cy="12" r="9.3"></circle>
                      <path d="M8.5 15.5l7-7"></path>
                      <circle cx="9" cy="9.2" r="1.3"></circle>
                      <circle cx="15" cy="14.8" r="1.3"></circle>
                    </svg>
                  }
                  @case ("spray") {
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
                      <path d="M9 3.5h4.5V7H9z"></path>
                      <path d="M6.5 7h9.5v13.5h-9.5z"></path>
                      <path d="M18 5.5c1.6 0 2.6 1 2.6 2.6V11"></path>
                    </svg>
                  }
                  @case ("shield") {
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E4436" stroke-width="1.3">
                      <path d="M12 2.6l7.5 2.8v6c0 4.4-3.1 8.2-7.5 10-4.4-1.8-7.5-5.6-7.5-10v-6z"></path>
                      <path d="M8.8 12l2.4 2.4 4-4.4"></path>
                    </svg>
                  }
                }
                <span class="rate-text">
                  @if (card.top) {
                    <span class="rate-top">{{ card.top }}</span>
                  }
                  <span class="rate-big">{{ card.big }}</span>
                  @if (card.sub) {
                    <span class="rate-sub">{{ card.sub }}</span>
                  }
                </span>
              </div>
            }
          </div>
          <div class="rates-footer">
            <p>Le tarif exact dépend des dates et de la durée du séjour. Les taxes touristiques sont calculées dans votre devis.</p>
            <a routerLink="/devis" class="btn btn-md">Calculer mon devis</a>
          </div>
        </div>
      </div>
    </section>

    <section id="reservation" class="container steps-section">
      <div class="steps-grid">
        <h2 class="steps-title">Une réservation simple, suivie personnellement</h2>
        <div class="steps-list">
          @for (step of steps; track step.text; let i = $index; let last = $last) {
            <div class="step">
              <span class="step-number">{{ i + 1 }}</span>
              @if (!last) {
                <span class="step-line"></span>
              }
              @switch (step.icon) {
                @case ("user") {
                  <svg viewBox="0 0 32 32" fill="none" stroke="#1E4436" stroke-width="1.2">
                    <circle cx="16" cy="11" r="4.6"></circle>
                    <path d="M6.5 27c0-4.7 4.2-8.4 9.5-8.4s9.5 3.7 9.5 8.4"></path>
                  </svg>
                }
                @case ("calendar") {
                  <svg viewBox="0 0 32 32" fill="none" stroke="#1E4436" stroke-width="1.2">
                    <rect x="4.5" y="7" width="23" height="20" rx="2"></rect>
                    <path d="M4.5 13h23M10.5 4v5M21.5 4v5"></path>
                  </svg>
                }
                @case ("document") {
                  <svg viewBox="0 0 32 32" fill="none" stroke="#1E4436" stroke-width="1.2">
                    <path d="M8 4h11l5 5v19H8z"></path>
                    <path d="M12 14h8M12 18.5h8M12 23h5"></path>
                  </svg>
                }
                @case ("check") {
                  <svg viewBox="0 0 32 32" fill="none" stroke="#1E4436" stroke-width="1.2">
                    <circle cx="16" cy="16" r="12"></circle>
                    <path d="M10.5 16.4l4 4 7.5-8"></path>
                  </svg>
                }
              }
              <span class="step-text">{{ step.text }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <section id="espace" class="container teaser-section">
      <div class="teaser-box">
        <h2 class="teaser-title">Votre réservation, au même endroit</h2>
        <div class="teaser-card">
          <div class="teaser-cell">
            <span class="teaser-label">Prochain séjour</span>
            <div class="teaser-stay">
              <img src="images/kiosque.jpg" alt="Terrasse de la villa" />
              <div class="teaser-stay-text">
                <span class="teaser-stay-dates">12 juin 2025 – 19 juin 2025</span>
                <span class="teaser-stay-meta">7 nuits · 6 voyageurs</span>
                <span class="teaser-stay-meta">Villa du Cassier Jaune</span>
                <a routerLink="/espace-client" class="teaser-link">Voir les détails</a>
              </div>
            </div>
          </div>
          <div class="teaser-cell bordered">
            <span class="teaser-label">Récapitulatif</span>
            <div class="teaser-row">
              <span class="teaser-key">Statut</span>
              <span class="badge" style="background: #EAF0EA; color: #1E4436;">Devis disponible</span>
            </div>
            <div class="teaser-row">
              <span class="teaser-key">Total estimé</span>
              <span class="teaser-value">1 680 €</span>
            </div>
            <a routerLink="/devis" class="teaser-download">
              Télécharger le devis
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M9 2.5v9M5.5 8.5L9 12l3.5-3.5M3 15h12"></path>
              </svg>
            </a>
          </div>
          <div class="teaser-cell bordered">
            <span class="teaser-label">Documents</span>
            <div class="teaser-row">
              <span class="teaser-doc">Devis</span>
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#55665E" stroke-width="1.4">
                <path d="M9 2.5v9M5.5 8.5L9 12l3.5-3.5M3 15h12"></path>
              </svg>
            </div>
            <div class="teaser-row">
              <span class="teaser-doc">Devis signé</span>
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#55665E" stroke-width="1.4">
                <path d="M9 2.5v9M5.5 8.5L9 12l3.5-3.5M3 15h12"></path>
              </svg>
            </div>
            <a routerLink="/espace-client" class="teaser-upload">
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M9 12.5v-9M5.5 6.5L9 3l3.5 3.5M3 15h12"></path>
              </svg>
              Téléverser le devis signé
            </a>
          </div>
        </div>
      </div>
    </section>

    <section id="devis" class="container cta-section">
      <div class="cta-box">
        <img src="images/deck-piscine.jpg" alt="" class="cta-bg" />
        <div class="cta-gradient"></div>
        <div class="cta-content">
          <div class="cta-text">
            <h2>Préparez votre séjour en Martinique</h2>
            <p>Choisissez vos dates pour recevoir un devis détaillé.</p>
          </div>
          <a routerLink="/devis" class="btn btn-lg">Demander un devis</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* Hero -------------------------------------------------------------- */
    .hero {
      position: relative;
      padding-top: 82px;
    }
    .hero-bg,
    .hero-gradient {
      position: absolute;
      inset: 0;
    }
    .hero-bg {
      background-image: url("/images/vue-globale.jpg");
      background-size: cover;
      background-position: center;
    }
    .hero-gradient {
      background: linear-gradient(
        100deg,
        rgba(11, 42, 32, 0.88) 0%,
        rgba(11, 42, 32, 0.62) 42%,
        rgba(11, 42, 32, 0.12) 72%,
        rgba(11, 42, 32, 0.25) 100%
      );
    }
    .hero-content {
      position: relative;
      padding-top: 96px;
      padding-bottom: 150px;
    }
    .hero-kicker {
      font-size: 12px;
      letter-spacing: 0.26em;
      color: rgba(255, 255, 255, 0.75);
      margin-bottom: 22px;
    }
    .hero-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(38px, 4.6vw, 66px);
      line-height: 1.08;
      color: #ffffff;
      margin: 0 0 26px;
      max-width: 15em;
      text-wrap: pretty;
    }
    .hero-text {
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.84);
      margin: 0 0 40px;
      max-width: 30em;
    }
    .hero-ctas {
      display: flex;
      align-items: center;
      gap: 34px;
      flex-wrap: wrap;
    }
    .hero-link {
      font-size: 15px;
      color: #ffffff;
      padding-bottom: 7px;
      border-bottom: 1.5px solid var(--accent);
    }
    .hero-link:hover {
      color: #ffffff;
      border-bottom-color: #ffffff;
    }

    /* Availability search ------------------------------------------------ */
    .search-wrap {
      position: relative;
      margin-top: -78px;
    }
    .search-card {
      position: relative;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 18px 44px rgba(17, 48, 37, 0.14);
      padding: 26px 28px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 22px 20px;
      align-items: end;
    }
    .search-field {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .search-label {
      font-size: 13.5px;
      color: var(--label);
    }
    .search-input-wrap {
      position: relative;
      display: block;
    }
    .input-icon {
      position: absolute;
      left: 13px;
      top: 13px;
      width: 16px;
      height: 16px;
      pointer-events: none;
    }
    .select-caret {
      position: absolute;
      right: 13px;
      top: 14px;
      width: 14px;
      height: 14px;
      pointer-events: none;
    }
    .search-input-wrap input,
    .search-input-wrap select {
      width: 100%;
      padding: 12px 12px 12px 38px;
      border: 1px solid var(--field-border);
      border-radius: 5px;
      font-size: 14px;
      color: var(--ink-strong);
      background: #ffffff;
    }
    .search-input-wrap select {
      appearance: none;
      padding-right: 38px;
    }
    .search-button {
      white-space: nowrap;
    }
    .dispo-slot {
      min-height: 26px;
      padding: 10px 4px 0;
    }
    .dispo {
      font-size: 13.5px;
      color: #2e6b4f;
    }
    .dispo.err {
      color: var(--err-ink);
    }

    /* Features ----------------------------------------------------------- */
    .features {
      margin-top: 6px;
      padding-top: 22px;
      padding-bottom: 40px;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      align-items: center;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 14px;
      justify-content: center;
      padding: 14px 0;
    }
    .feature + .feature {
      border-left: 1px solid #e7e2d8;
    }
    .feature svg {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
    }
    .feature span {
      font-size: 14.5px;
      color: #33443c;
    }

    /* Villa --------------------------------------------------------------- */
    .villa-section {
      padding-top: 0;
      padding-bottom: 0;
    }
    .villa-box {
      background: var(--cream);
      border-radius: 8px;
      display: grid;
      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.28fr);
      gap: 46px;
      padding: 52px 0 52px 52px;
      align-items: center;
    }
    .villa-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(30px, 3vw, 42px);
      line-height: 1.16;
      color: var(--title);
      margin: 0 0 26px;
      text-wrap: pretty;
    }
    .villa-paragraph {
      font-size: 15.5px;
      line-height: 1.75;
      color: #4b5c54;
      margin: 0 0 30px;
      max-width: 30em;
    }
    .villa-link {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
    }
    .villa-images {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      grid-template-rows: 1fr 1fr;
      gap: 12px;
      padding-right: 12px;
    }
    .villa-images img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
      display: block;
    }
    .img-tall {
      grid-row: span 2;
    }

    /* Rates ----------------------------------------------------------------- */
    .rates-section {
      margin-top: 24px;
    }
    .rates-box {
      background: var(--sand);
      border-radius: 8px;
      padding: 44px 46px;
      display: grid;
      grid-template-columns: minmax(240px, 0.62fr) minmax(0, 2.1fr);
      gap: 40px;
    }
    .rates-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(28px, 2.7vw, 38px);
      line-height: 1.18;
      color: var(--title);
      margin: 0;
    }
    .rates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
      gap: 14px;
    }
    .rate-card {
      background: #fffcf7;
      border: 1px solid #ebdcc4;
      border-radius: 6px;
      padding: 20px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .rate-card svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .rate-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rate-top {
      font-size: 12.5px;
      color: var(--muted);
    }
    .rate-big {
      font-family: var(--serif);
      font-size: 27px;
      color: var(--title);
      line-height: 1.1;
      white-space: nowrap;
    }
    .rate-sub {
      font-size: 12.5px;
      color: var(--muted);
    }
    .rates-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 40px;
      margin-top: 26px;
    }
    .rates-footer p {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--muted);
      margin: 0;
      max-width: 34em;
    }

    /* Booking steps ------------------------------------------------------------ */
    .steps-section {
      padding-top: 64px;
      padding-bottom: 56px;
    }
    .steps-grid {
      display: grid;
      grid-template-columns: minmax(240px, 0.62fr) minmax(0, 2.1fr);
      gap: 40px;
      align-items: center;
    }
    .steps-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(28px, 2.7vw, 38px);
      line-height: 1.18;
      color: var(--title);
      margin: 0;
    }
    .steps-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 26px 22px;
      position: relative;
      overflow: hidden;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      position: relative;
    }
    .step-number {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--green);
      color: #ffffff;
      font-size: 13.5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-line {
      position: absolute;
      top: 15px;
      left: calc(50% + 26px);
      right: -50%;
      border-top: 1.5px dotted #b9c4bd;
    }
    .step svg {
      width: 30px;
      height: 30px;
    }
    .step-text {
      font-size: 14px;
      color: #33443c;
      text-align: center;
    }

    /* Customer-area teaser -------------------------------------------------------- */
    .teaser-section {
      padding-top: 0;
    }
    .teaser-box {
      background: #f7f4ee;
      border-radius: 8px;
      padding: 44px 46px;
      display: grid;
      grid-template-columns: minmax(240px, 0.62fr) minmax(0, 2.1fr);
      gap: 40px;
      align-items: center;
    }
    .teaser-title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(28px, 2.7vw, 38px);
      line-height: 1.18;
      color: var(--title);
      margin: 0;
    }
    .teaser-card {
      background: #ffffff;
      border: 1px solid #e8e4da;
      border-radius: 6px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    }
    .teaser-cell {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .teaser-cell.bordered {
      border-left: 1px solid #ede9e0;
    }
    .teaser-label {
      font-size: 12.5px;
      letter-spacing: 0.06em;
      color: var(--muted);
    }
    .teaser-stay {
      display: flex;
      gap: 16px;
    }
    .teaser-stay img {
      width: 104px;
      height: 76px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
      flex-shrink: 0;
    }
    .teaser-stay-text {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .teaser-stay-dates {
      font-size: 13.5px;
      color: var(--ink-strong);
    }
    .teaser-stay-meta {
      font-size: 13px;
      color: var(--muted);
    }
    .teaser-link {
      font-size: 13px;
      margin-top: 3px;
    }
    .teaser-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .teaser-key {
      font-size: 13.5px;
      color: var(--label);
    }
    .teaser-value {
      font-size: 13.5px;
      color: var(--ink-strong);
    }
    .teaser-doc {
      font-size: 13.5px;
      color: #33443c;
    }
    .teaser-download {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13.5px;
      margin-top: 4px;
    }
    .teaser-upload {
      margin-top: 6px;
      padding: 11px 14px;
      border: 1px dashed #c6cfc8;
      border-radius: 5px;
      color: #33443c;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      white-space: nowrap;
    }
    .teaser-upload:hover {
      border-color: var(--green);
      color: var(--green);
    }

    /* CTA banner -------------------------------------------------------------- */
    .cta-section {
      margin-top: 24px;
    }
    .cta-box {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
    }
    .cta-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cta-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(20, 58, 44, 0.96) 0%,
        rgba(20, 58, 44, 0.88) 46%,
        rgba(20, 58, 44, 0.42) 78%,
        rgba(20, 58, 44, 0.3) 100%
      );
    }
    .cta-content {
      position: relative;
      padding: 44px 46px;
      display: flex;
      align-items: center;
      gap: 40px;
      flex-wrap: wrap;
    }
    .cta-text {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cta-text h2 {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 36px;
      line-height: 1.15;
      color: #ffffff;
      margin: 0;
    }
    .cta-text p {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.82);
      margin: 0;
    }
    .cta-content .btn {
      white-space: nowrap;
    }

    /* Responsive ------------------------------------------------------------------ */
    @media (max-width: 1000px) {
      .villa-box {
        grid-template-columns: 1fr;
        padding: 36px 32px;
        gap: 30px;
      }
      .villa-images {
        padding-right: 0;
      }
      .rates-box,
      .teaser-box,
      .steps-grid {
        grid-template-columns: 1fr;
        padding: 32px;
        gap: 28px;
      }
      .teaser-cell.bordered {
        border-left: none;
        border-top: 1px solid #ede9e0;
      }
      .feature + .feature {
        border-left: none;
      }
    }
    @media (max-width: 640px) {
      .hero-content {
        padding-top: 48px;
        padding-bottom: 110px;
      }
      .rates-footer {
        flex-direction: column;
        align-items: flex-start;
      }
      .cta-content {
        padding: 32px 24px;
      }
      .villa-images {
        grid-template-columns: 1fr 1.2fr;
      }
    }
  `,
})
export class HomePage {
  readonly #router = inject(Router)

  readonly arrivee = signal("")
  readonly depart = signal("")
  readonly voyageurs = signal("2")
  readonly dispo = signal<DispoMessage | null>(null)

  readonly priceCards: PriceCard[] = [
    { icon: "tag", top: "À partir de", big: `${WEEKLY_BASE.toLocaleString("fr-FR")} €`, sub: "la semaine" },
    { icon: "percent", big: "10 %", sub: "de remise dès 8 nuits" },
    { icon: "percent", big: "15 %", sub: "de remise dès 15 nuits" },
    { icon: "spray", top: "Ménage obligatoire :", big: "200 €" },
    { icon: "shield", top: "Caution :", big: "2 000 €" },
  ]

  readonly steps: Step[] = [
    { icon: "user", text: "Créez votre compte" },
    { icon: "calendar", text: "Choisissez vos dates" },
    { icon: "document", text: "Recevez et signez votre devis" },
    { icon: "check", text: "Le propriétaire valide votre réservation" },
  ]

  onArrivee(event: Event): void {
    this.arrivee.set((event.target as HTMLInputElement).value)
    this.dispo.set(null)
  }

  onDepart(event: Event): void {
    this.depart.set((event.target as HTMLInputElement).value)
    this.dispo.set(null)
  }

  onVoyageurs(event: Event): void {
    this.voyageurs.set((event.target as HTMLSelectElement).value)
  }

  /**
   * The funnel entry: with both dates, head straight to the quotation page
   * (it re-checks live availability) carrying the stay as query params and
   * per-session storage. Without both dates, ask inline — no dead ends.
   */
  allerAuDevis(): void {
    const stay = { arrivee: this.arrivee(), depart: this.depart(), voyageurs: this.voyageurs() }
    if (stay.arrivee === "" || stay.depart === "") {
      this.dispo.set({
        text: "Indiquez une date d'arrivée et une date de départ pour vérifier les disponibilités.",
        ok: false,
      })
      return
    }
    if (nightsBetween(stay.arrivee, stay.depart) === 0) {
      this.dispo.set({ text: "La date de départ doit être postérieure à la date d'arrivée.", ok: false })
      return
    }
    writeStay(stay)
    void this.#router.navigate(["/devis"], { queryParams: stayQueryParams(stay) })
  }
}
