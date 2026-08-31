import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../core/auth.service';
import { Internationalization } from '../core/internationalization';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="wrap">
      <div class="card">
        <h1 class="title">{{ i18n.t('forgotPassword.title') }}</h1>
        @if (done()) {
          <p class="ok">{{ i18n.t('forgotPassword.sent') }}</p>
          <a routerLink="/connexion" class="btn btn-md">{{ i18n.t('auth.backToSignIn') }}</a>
        } @else {
          <p class="intro">{{ i18n.t('forgotPassword.intro') }}</p>
          <form #f="ngForm" (ngSubmit)="submit()" class="form">
            <label class="field">
              <span class="field-label">{{ i18n.t('fields.email') }}</span>
              <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
            </label>
            <button type="submit" class="btn btn-md" [disabled]="f.invalid || busy()">
              {{ i18n.t('forgotPassword.submit') }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    .wrap {
      max-width: 480px;
      margin: 0 auto;
      padding: 56px 24px 72px;
    }
    .card {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 36px 38px;
    }
    .title {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 32px;
      color: var(--title);
      margin: 0 0 14px;
    }
    .intro {
      font-size: 14.5px;
      line-height: 1.65;
      color: var(--muted);
      margin: 0 0 24px;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .ok {
      font-size: 14px;
      line-height: 1.65;
      color: var(--ok-ink);
      background: var(--ok-bg);
      border-radius: 5px;
      padding: 14px 16px;
      margin: 0 0 20px;
    }
  `,
})
export class ForgotPasswordPage {
  readonly i18n = inject(Internationalization);
  readonly #auth = inject(Auth);
  email = '';
  readonly busy = signal(false);
  readonly done = signal(false);

  async submit(): Promise<void> {
    this.busy.set(true);
    try {
      await this.#auth.requestPasswordReset(this.email);
      this.done.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
