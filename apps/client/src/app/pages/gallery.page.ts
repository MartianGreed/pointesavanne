import { Component, HostListener, computed, signal } from "@angular/core"

interface GalleryPhoto {
  readonly src: string
  readonly cat: string
  readonly caption: string
}

const CATEGORIES = ["Tout", "Extérieurs", "Piscine", "Pièces à vivre", "Chambres", "Salles de bain"] as const

const PHOTOS: readonly GalleryPhoto[] = [
  { src: "images/vue-globale.jpg", cat: "Extérieurs", caption: "La villa et sa piscine" },
  { src: "images/villa-jardin.jpg", cat: "Extérieurs", caption: "La villa côté jardin" },
  { src: "images/piscine-carbet.jpg", cat: "Piscine", caption: "La piscine et son carbet" },
  { src: "images/deck-piscine.jpg", cat: "Piscine", caption: "Le deck de la piscine" },
  { src: "images/vue-mer-deck.jpg", cat: "Piscine", caption: "Vue sur la mer depuis le deck" },
  { src: "images/eau-claire.jpg", cat: "Piscine", caption: "Eau claire, fond en pierre naturelle" },
  { src: "images/piscine-terrasse.jpg", cat: "Piscine", caption: "La piscine au pied de la terrasse" },
  { src: "images/hamac-carbet.jpg", cat: "Piscine", caption: "Hamac sous le carbet" },
  { src: "images/terrasse-couverte.jpg", cat: "Extérieurs", caption: "La terrasse couverte" },
  { src: "images/balcon-etage.jpg", cat: "Extérieurs", caption: "Le balcon de l'étage" },
  { src: "images/kiosque.jpg", cat: "Extérieurs", caption: "Le kiosque au fond du jardin" },
  { src: "images/jardin-bougainvilliers.jpg", cat: "Extérieurs", caption: "Le jardin et ses bougainvilliers" },
  { src: "images/douche-exterieure.jpg", cat: "Extérieurs", caption: "La douche extérieure en pierre" },
  { src: "images/plancha-jardin.jpg", cat: "Extérieurs", caption: "La plancha côté jardin" },
  { src: "images/carport-entree.jpg", cat: "Extérieurs", caption: "Le carport et l'entrée" },
  { src: "images/salon-interieur.jpg", cat: "Pièces à vivre", caption: "Le salon ouvert sur la terrasse" },
  { src: "images/salon.jpg", cat: "Pièces à vivre", caption: "Le salon" },
  { src: "images/cuisine.jpg", cat: "Pièces à vivre", caption: "La cuisine équipée" },
  { src: "images/passe-plat.jpg", cat: "Pièces à vivre", caption: "Le passe-plat du petit-déjeuner" },
  { src: "images/chambre-1.jpg", cat: "Chambres", caption: "Chambre 1" },
  { src: "images/chambre-3.jpg", cat: "Chambres", caption: "Chambre 3, ouverte sur le balcon" },
  { src: "images/chambre-2.jpg", cat: "Chambres", caption: "Chambre 2, lits superposés" },
  { src: "images/salle-de-bain-1.jpg", cat: "Salles de bain", caption: "Salle de bain 1" },
  { src: "images/salle-de-bain-2.jpg", cat: "Salles de bain", caption: "Salle de bain 2" },
]

/** The photo gallery: category filters, masonry grid and a lightbox. */
@Component({
  selector: "app-gallery",
  imports: [],
  template: `
    <section class="container intro">
      <div class="kicker">GALERIE</div>
      <h1 class="title">La villa en images</h1>
      <p class="text">
        Jardin, piscine, terrasses et chambres : un aperçu fidèle de la maison telle que vous la
        trouverez à votre arrivée.
      </p>
    </section>

    <section class="container filters">
      @for (cat of categories; track cat) {
        <button
          type="button"
          class="pill"
          [class.active]="filtre() === cat"
          (click)="setFiltre(cat)"
        >
          {{ cat }}
        </button>
      }
    </section>

    <section class="container grid">
      @for (photo of visible(); track photo.src; let i = $index) {
        <figure class="photo" (click)="open(i)">
          <img [src]="photo.src" [alt]="photo.caption" loading="lazy" />
        </figure>
      }
    </section>

    @if (current(); as photo) {
      <div class="lightbox" (click)="close()" role="dialog" aria-modal="true">
        <div
          class="lightbox-image"
          role="img"
          [attr.aria-label]="photo.caption"
          [style.background-image]="'url(' + photo.src + ')'"
        ></div>
        <div class="lightbox-caption">
          {{ photo.caption }} · {{ index() + 1 }} / {{ visible().length }}
        </div>
        <button type="button" class="lightbox-close" aria-label="Fermer" (click)="close()">✕</button>
        <button
          type="button"
          class="lightbox-nav lightbox-prev"
          aria-label="Photo précédente"
          (click)="prev($event)"
        >‹</button>
        <button
          type="button"
          class="lightbox-nav lightbox-next"
          aria-label="Photo suivante"
          (click)="next($event)"
        >›</button>
      </div>
    }
  `,
  styles: `
    .intro {
      padding-top: 56px;
      padding-bottom: 8px;
    }
    .intro .kicker {
      margin-bottom: 16px;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 48px;
      line-height: 1.12;
      color: var(--title);
      margin: 0 0 18px;
      text-wrap: pretty;
    }
    .text {
      font-size: 15.5px;
      line-height: 1.7;
      color: #4b5c54;
      margin: 0;
      max-width: 40em;
    }
    .filters {
      padding-top: 26px;
      padding-bottom: 12px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill {
      padding: 10px 18px;
      border-radius: 20px;
      border: 1px solid #dcd7cb;
      background: #ffffff;
      color: #33443c;
      font-size: 13.5px;
      cursor: pointer;
    }
    .pill.active {
      background: var(--green);
      border-color: var(--green);
      color: #ffffff;
    }
    .grid {
      padding-top: 14px;
      padding-bottom: 64px;
      column-count: 3;
      column-gap: 14px;
    }
    .photo {
      margin: 0 0 14px;
      break-inside: avoid;
      border-radius: 6px;
      overflow: hidden;
      cursor: zoom-in;
      background: #ede9e0;
    }
    .photo img {
      width: 100%;
      display: block;
      transition: transform 0.35s ease;
    }
    .photo:hover img {
      transform: scale(1.04);
    }
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(12, 30, 23, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 90px;
    }
    .lightbox-image {
      width: 100%;
      height: 82vh;
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    }
    .lightbox-caption {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 26px;
      text-align: center;
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      pointer-events: none;
    }
    .lightbox-close,
    .lightbox-nav {
      position: absolute;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-size: 20px;
      cursor: pointer;
    }
    .lightbox-close:hover,
    .lightbox-nav:hover {
      background: rgba(255, 255, 255, 0.24);
    }
    .lightbox-close {
      top: 22px;
      right: 26px;
      width: 44px;
      height: 44px;
    }
    .lightbox-nav {
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
    }
    .lightbox-prev {
      left: 24px;
    }
    .lightbox-next {
      right: 24px;
    }
    @media (max-width: 1000px) {
      .grid {
        column-count: 2;
      }
      .lightbox {
        padding: 48px 20px;
      }
    }
    @media (max-width: 640px) {
      .grid {
        column-count: 1;
      }
      .title {
        font-size: 36px;
      }
    }
  `,
})
export class GalleryPage {
  readonly categories = CATEGORIES
  readonly filtre = signal<string>("Tout")
  readonly index = signal(-1)

  readonly visible = computed(() => {
    const filtre = this.filtre()
    return filtre === "Tout" ? PHOTOS : PHOTOS.filter((photo) => photo.cat === filtre)
  })

  readonly current = computed(() => {
    const i = this.index()
    return i >= 0 ? (this.visible()[i] ?? null) : null
  })

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (this.index() < 0) return
    if (event.key === "Escape") this.index.set(-1)
    if (event.key === "ArrowLeft") this.step(-1)
    if (event.key === "ArrowRight") this.step(1)
  }

  setFiltre(cat: string): void {
    this.filtre.set(cat)
    this.index.set(-1)
  }

  open(i: number): void {
    this.index.set(i)
  }

  close(): void {
    this.index.set(-1)
  }

  prev(event: MouseEvent): void {
    event.stopPropagation()
    this.step(-1)
  }

  next(event: MouseEvent): void {
    event.stopPropagation()
    this.step(1)
  }

  private step(delta: number): void {
    const total = this.visible().length
    this.index.set((this.index() + delta + total) % total)
  }
}
