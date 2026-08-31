import { Injectable } from '@angular/core';
import {
  frenchTranslations,
  type ErrorTranslationKey,
  type PluralTranslation,
  type PluralTranslationKey,
  type TextTranslationKey,
} from './translations/fr';

export type TranslationParameters = Readonly<Record<string, string | number>>;

export const backendErrorTranslationKeys = {
  AuthValidationError: 'errors.backend.validation',
  ValidationFailed: 'errors.backend.validation',
  NotFound: 'errors.backend.notFound',
  InvariantViolation: 'errors.backend.conflict',
  ConcurrencyConflict: 'errors.backend.conflict',
  Unauthenticated: 'errors.backend.unauthenticated',
  Unauthorized: 'errors.backend.unauthenticated',
  PermissionDenied: 'errors.backend.permissionDenied',
  EmailNotVerified: 'errors.backend.emailNotVerified',
  InvalidCredentials: 'errors.backend.invalidCredentials',
  UnsupportedPasskey: 'errors.backend.unsupportedPasskey',
  InvalidAuthToken: 'errors.backend.invalidAuthToken',
  IdentityConflict: 'errors.backend.identityConflict',
  AccountLinkDenied: 'errors.backend.accountLinkDenied',
  RateLimitExceeded: 'errors.backend.rateLimit',
  AuthDependencyError: 'errors.backend.unavailable',
  AuthStoreError: 'errors.backend.unavailable',
  AuthUnavailable: 'errors.backend.unavailable',
  AuthInternalError: 'errors.backend.unavailable',
  InternalServerError: 'errors.backend.unavailable',
  DispatchTimeout: 'errors.backend.unavailable',
} as const satisfies Record<string, ErrorTranslationKey>;

type BackendErrorTag = keyof typeof backendErrorTranslationKeys;

const recordOf = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === 'object' && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

const backendErrorTag = (cause: unknown): BackendErrorTag | undefined => {
  const causeRecord = recordOf(cause);
  const problem = recordOf(causeRecord?.['problem']) ?? causeRecord;
  const candidate = problem?.['error'] ?? problem?.['_tag'];
  return typeof candidate === 'string' && candidate in backendErrorTranslationKeys
    ? (candidate as BackendErrorTag)
    : undefined;
};

const interpolate = (message: string, parameters: TranslationParameters): string =>
  message.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = parameters[name];
    if (value === undefined) throw new Error(`Missing translation parameter: ${name}`);
    return String(value);
  });

/** French message lookup and locale formatting for every client-facing string. */
@Injectable({ providedIn: 'root' })
export class Internationalization {
  readonly locale = 'fr-FR';
  readonly #pluralRules = new Intl.PluralRules(this.locale);

  t(key: TextTranslationKey, parameters: TranslationParameters = {}): string {
    return interpolate(frenchTranslations[key] as string, parameters);
  }

  plural(key: PluralTranslationKey, count: number, parameters: TranslationParameters = {}): string {
    const translation = frenchTranslations[key] as PluralTranslation;
    const form = this.#pluralRules.select(count) === 'one' ? translation.one : translation.other;
    return interpolate(form, { ...parameters, count });
  }

  date(isoDay: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, options).format(new Date(`${isoDay}T12:00:00`));
  }

  longDate(isoDay: string): string {
    return this.date(isoDay, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  shortDate(isoDay: string): string {
    return this.date(isoDay, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  euros(value: number, options?: Intl.NumberFormatOptions): string {
    return this.number(value, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    });
  }

  error(cause: unknown, fallbackKey: ErrorTranslationKey = 'errors.generic'): string {
    const causeRecord = recordOf(cause);
    if (causeRecord?.['name'] === 'NotAllowedError') return this.t('errors.passkey.cancelled');
    const tag = backendErrorTag(cause);
    return this.t(tag === undefined ? fallbackKey : backendErrorTranslationKeys[tag]);
  }

  applyDocumentMetadata(document: Document): void {
    document.documentElement.lang = 'fr';
    document.title = this.t('metadata.title');
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', this.t('metadata.description'));
  }
}
