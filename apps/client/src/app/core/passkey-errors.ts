import { ApiError } from './api';
import { Internationalization } from './internationalization';
import type { ErrorTranslationKey } from './translations/fr';

/**
 * Maps passkey-ceremony failures onto safe, actionable French messages.
 * The auth API classifies its refusals as `{ error: Tag, message }` (surfaced
 * by ApiError as `problem`); the browser reports cancel/unsupported cases as
 * a DOMException named NotAllowedError.
 */

const errorTag = (e: unknown): string => {
  if (e instanceof ApiError) return e.problem.error ?? '';
  if (
    typeof e === 'object' &&
    e !== null &&
    'error' in e &&
    typeof (e as { error: unknown }).error === 'string'
  ) {
    return (e as { error: string }).error;
  }
  return '';
};

/** One message per known failure mode, falling back to `fallback`. */
export const passkeyErrorMessage = (
  e: unknown,
  i18n: Internationalization,
  fallbackKey: ErrorTranslationKey,
): string => {
  if (e instanceof DOMException && e.name === 'NotAllowedError') {
    return i18n.t('errors.passkey.cancelled');
  }
  const tag = errorTag(e);
  if (tag === 'InvalidCredentials') {
    return i18n.t('errors.passkey.unrecognized');
  }
  if (tag === 'UnsupportedPasskey') {
    return i18n.t('errors.backend.unsupportedPasskey');
  }
  if (tag === 'EmailNotVerified') {
    return i18n.t('errors.passkey.emailNotVerified');
  }
  if (tag === 'InvalidAuthToken') {
    return i18n.t('errors.backend.invalidAuthToken');
  }
  return i18n.t(fallbackKey);
};
