import { Component } from "@angular/core"
import { RouterLink } from "@angular/router"

@Component({
  selector: "app-home",
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1>Villa de standing — Pointe Savanne, Maurice</h1>
      <p class="tagline">
        Villa de plain-pied avec piscine face au lagon, à deux pas de la plage de Pointe aux Cannies.
        Location de semaine, de mars à décembre.
      </p>
      <div class="cta">
        <a routerLink="/devis" class="button">Demander un devis</a>
        <a routerLink="/connexion" class="button secondary">Mon espace client</a>
      </div>
    </section>

    <section class="grid">
      <article>
        <h2>La villa</h2>
        <ul>
          <li>4 chambres climatisées, 8 couchages</li>
          <li>Piscine privée et terrasse plein sud</li>
          <li>Jardin clos, parking privé</li>
        </ul>
      </article>
      <article>
        <h2>Tarifs</h2>
        <ul>
          <li>Semaine de 1 600 € à 2 090 € selon la saison</li>
          <li>Remise 10 % dès 8 nuits, 15 % dès 15 nuits</li>
          <li>Taxe touristique et ménage obligatoire en supplément</li>
        </ul>
      </article>
      <article>
        <h2>Réservation</h2>
        <ol>
          <li>Créez votre compte client</li>
          <li>Demandez votre devis en ligne</li>
          <li>Signez et téléversez le devis reçu</li>
        </ol>
      </article>
    </section>
  `,
  styles: `
    .hero { padding: 4rem 2rem 2rem; max-width: 60rem; margin: 0 auto; }
    h1 { font-size: 2rem; }
    .tagline { font-size: 1.1rem; color: #444; }
    .cta { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .button {
      display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem;
      background: #0d5c4d; color: white; text-decoration: none; font-weight: 600;
    }
    .button.secondary { background: transparent; color: #0d5c4d; border: 1px solid #0d5c4d; }
    .grid {
      display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      max-width: 60rem; margin: 2rem auto; padding: 0 2rem 4rem;
    }
    article { padding: 1.25rem; border: 1px solid #ddd; border-radius: 0.75rem; }
  `,
})
export class HomePage {}
