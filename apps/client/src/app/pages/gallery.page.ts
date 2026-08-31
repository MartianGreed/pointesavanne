import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Internationalization } from '../core/internationalization';
import type { TextTranslationKey } from '../core/translations/fr';

type GalleryCategory = 'all' | 'outside' | 'pool' | 'living' | 'bedrooms' | 'bathrooms';

interface GalleryPhoto {
  readonly src: string;
  readonly category: Exclude<GalleryCategory, 'all'>;
  readonly captionKey: TextTranslationKey;
}

const CATEGORIES: readonly {
  readonly id: GalleryCategory;
  readonly labelKey: TextTranslationKey;
}[] = [
  { id: 'all', labelKey: 'gallery.categories.all' },
  { id: 'outside', labelKey: 'gallery.categories.outside' },
  { id: 'pool', labelKey: 'gallery.categories.pool' },
  { id: 'living', labelKey: 'gallery.categories.living' },
  { id: 'bedrooms', labelKey: 'gallery.categories.bedrooms' },
  { id: 'bathrooms', labelKey: 'gallery.categories.bathrooms' },
];

const PHOTOS: readonly GalleryPhoto[] = [
  { src: 'images/vue-globale.jpg', category: 'outside', captionKey: 'gallery.photos.overview' },
  { src: 'images/villa-jardin.jpg', category: 'outside', captionKey: 'gallery.photos.gardenVilla' },
  { src: 'images/piscine-carbet.jpg', category: 'pool', captionKey: 'gallery.photos.poolCarbet' },
  { src: 'images/deck-piscine.jpg', category: 'pool', captionKey: 'gallery.photos.poolDeck' },
  { src: 'images/vue-mer-deck.jpg', category: 'pool', captionKey: 'gallery.photos.seaView' },
  { src: 'images/eau-claire.jpg', category: 'pool', captionKey: 'gallery.photos.clearWater' },
  {
    src: 'images/piscine-terrasse.jpg',
    category: 'pool',
    captionKey: 'gallery.photos.poolTerrace',
  },
  { src: 'images/hamac-carbet.jpg', category: 'pool', captionKey: 'gallery.photos.hammock' },
  {
    src: 'images/terrasse-couverte.jpg',
    category: 'outside',
    captionKey: 'gallery.photos.coveredTerrace',
  },
  { src: 'images/balcon-etage.jpg', category: 'outside', captionKey: 'gallery.photos.balcony' },
  { src: 'images/kiosque.jpg', category: 'outside', captionKey: 'gallery.photos.kiosk' },
  {
    src: 'images/jardin-bougainvilliers.jpg',
    category: 'outside',
    captionKey: 'gallery.photos.bougainvillea',
  },
  {
    src: 'images/douche-exterieure.jpg',
    category: 'outside',
    captionKey: 'gallery.photos.outdoorShower',
  },
  { src: 'images/plancha-jardin.jpg', category: 'outside', captionKey: 'gallery.photos.plancha' },
  { src: 'images/carport-entree.jpg', category: 'outside', captionKey: 'gallery.photos.carport' },
  {
    src: 'images/salon-interieur.jpg',
    category: 'living',
    captionKey: 'gallery.photos.openLivingRoom',
  },
  { src: 'images/salon.jpg', category: 'living', captionKey: 'gallery.photos.livingRoom' },
  { src: 'images/cuisine.jpg', category: 'living', captionKey: 'gallery.photos.kitchen' },
  { src: 'images/passe-plat.jpg', category: 'living', captionKey: 'gallery.photos.breakfastHatch' },
  { src: 'images/chambre-1.jpg', category: 'bedrooms', captionKey: 'gallery.photos.bedroom1' },
  { src: 'images/chambre-3.jpg', category: 'bedrooms', captionKey: 'gallery.photos.bedroom3' },
  { src: 'images/chambre-2.jpg', category: 'bedrooms', captionKey: 'gallery.photos.bedroom2' },
  {
    src: 'images/salle-de-bain-1.jpg',
    category: 'bathrooms',
    captionKey: 'gallery.photos.bathroom1',
  },
  {
    src: 'images/salle-de-bain-2.jpg',
    category: 'bathrooms',
    captionKey: 'gallery.photos.bathroom2',
  },
];

/** The photo gallery: category filters, masonry grid and a lightbox. */
@Component({
  selector: 'app-gallery',
  imports: [],
  template: `
    <section class="container intro">
      <div class="kicker">{{ i18n.t('gallery.kicker') }}</div>
      <h1 class="title">{{ i18n.t('gallery.title') }}</h1>
      <p class="text">{{ i18n.t('gallery.intro') }}</p>
    </section>

    <section class="container filters">
      @for (cat of categories; track cat.id) {
        <button
          type="button"
          class="pill"
          [class.active]="filtre() === cat.id"
          (click)="setFiltre(cat.id)"
        >
          {{ i18n.t(cat.labelKey) }}
        </button>
      }
    </section>

    <section class="container grid">
      @for (photo of visible(); track photo.src; let i = $index) {
        <figure class="photo" (click)="open(i)">
          <img [src]="photo.src" [alt]="i18n.t(photo.captionKey)" loading="lazy" />
        </figure>
      }
    </section>

    @if (current(); as photo) {
      <div class="lightbox" (click)="close()" role="dialog" aria-modal="true">
        <div
          class="lightbox-image"
          role="img"
          [attr.aria-label]="i18n.t(photo.captionKey)"
          [style.background-image]="'url(' + photo.src + ')'"
        ></div>
        <div class="lightbox-caption">
          {{ i18n.t(photo.captionKey) }} · {{ index() + 1 }} / {{ visible().length }}
        </div>
        <button
          type="button"
          class="lightbox-close"
          [attr.aria-label]="i18n.t('gallery.actions.close')"
          (click)="close()"
        >
          ✕
        </button>
        <button
          type="button"
          class="lightbox-nav lightbox-prev"
          [attr.aria-label]="i18n.t('gallery.actions.previous')"
          (click)="prev($event)"
        >
          ‹
        </button>
        <button
          type="button"
          class="lightbox-nav lightbox-next"
          [attr.aria-label]="i18n.t('gallery.actions.next')"
          (click)="next($event)"
        >
          ›
        </button>
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
  readonly i18n = inject(Internationalization);
  readonly categories = CATEGORIES;
  readonly filtre = signal<GalleryCategory>('all');
  readonly index = signal(-1);

  readonly visible = computed(() => {
    const filtre = this.filtre();
    return filtre === 'all' ? PHOTOS : PHOTOS.filter((photo) => photo.category === filtre);
  });

  readonly current = computed(() => {
    const i = this.index();
    return i >= 0 ? (this.visible()[i] ?? null) : null;
  });

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.index() < 0) return;
    if (event.key === 'Escape') this.index.set(-1);
    if (event.key === 'ArrowLeft') this.step(-1);
    if (event.key === 'ArrowRight') this.step(1);
  }

  setFiltre(cat: GalleryCategory): void {
    this.filtre.set(cat);
    this.index.set(-1);
  }

  open(i: number): void {
    this.index.set(i);
  }

  close(): void {
    this.index.set(-1);
  }

  prev(event: MouseEvent): void {
    event.stopPropagation();
    this.step(-1);
  }

  next(event: MouseEvent): void {
    event.stopPropagation();
    this.step(1);
  }

  private step(delta: number): void {
    const total = this.visible().length;
    this.index.set((this.index() + delta + total) % total);
  }
}
