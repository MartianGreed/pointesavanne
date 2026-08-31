import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../core/auth.service';
import { Internationalization } from '../core/internationalization';

/** The verification link lands here with a token; it is POSTed immediately. */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  template: `
    <section class="wrap">
      <div class="card">
        <h1 class="title">{{ i18n.t('verifyEmail.title') }}</h1>
        @if (state() === 'pending') {
          <p class="intro">{{ i18n.t('verifyEmail.pending') }}</p>
        } @else if (state() === 'ok') {
          <p class="ok">{{ i18n.t('verifyEmail.done') }}</p>
          <a routerLink="/connexion" class="btn btn-md">{{ i18n.t('auth.signIn') }}</a>
        } @else {
          <div class="box box-err error">{{ i18n.t('errors.auth.invalidLink') }}</div>
          <a routerLink="/connexion" class="btn btn-md">{{ i18n.t('auth.backToSignIn') }}</a>
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
      margin: 0;
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
export class VerifyEmailPage implements OnInit {
  readonly i18n = inject(Internationalization);
  readonly #route = inject(ActivatedRoute);
  readonly #auth = inject(Auth);
  readonly state = signal<'pending' | 'ok' | 'failed'>('pending');

  ngOnInit(): void {
    const token = this.#route.snapshot.queryParamMap.get('token') ?? '';
    this.#auth
      .verifyEmail(token)
      .then(() => this.state.set('ok'))
      .catch(() => this.state.set('failed'));
  }
}
