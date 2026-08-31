import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeader } from './shared/site-header.component';
import { SiteFooter } from './shared/site-footer.component';
import { Auth } from './core/auth.service';
import { Internationalization } from './core/internationalization';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <app-site-header />
    <main class="app-main">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export class App {
  private readonly auth = inject(Auth);
  private readonly i18n = inject(Internationalization);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.i18n.applyDocumentMetadata(this.document);
    void this.auth.refresh();
  }
}
