import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../core/auth.service';
import { Internationalization } from '../core/internationalization';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="wrap">
      <div class="card">
        <h1 class="title">{{ i18n.t('resetPassword.title') }}</h1>
        @if (done()) {
          <p class="ok">{{ i18n.t('resetPassword.done') }}</p>
          <a routerLink="/connexion" class="btn btn-md">{{ i18n.t('auth.signIn') }}</a>
        } @else {
          <p class="intro">{{ i18n.t('resetPassword.intro') }}</p>
          @if (error()) {
            <div class="box box-err error">{{ error() }}</div>
          }
          <form #f="ngForm" (ngSubmit)="submit()" class="form">
            <label class="field">
              <span class="field-label">{{ i18n.t('fields.newPassword') }}</span>
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </label>
            <button type="submit" class="btn btn-md" [disabled]="f.invalid || busy()">
              {{ i18n.t('common.actions.save') }}
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
    .error {
      margin-bottom: 20px;
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
export class ResetPasswordPage {
  readonly i18n = inject(Internationalization);
  readonly #route = inject(ActivatedRoute);
  readonly #auth = inject(Auth);
  password = '';
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const token = this.#route.snapshot.queryParamMap.get('token') ?? '';
      await this.#auth.completePasswordReset(token, this.password);
      this.done.set(true);
    } catch (cause) {
      this.error.set(this.i18n.error(cause, 'errors.auth.invalidLink'));
    } finally {
      this.busy.set(false);
    }
  }
}
