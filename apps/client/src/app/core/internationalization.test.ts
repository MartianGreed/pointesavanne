import { describe, expect, test } from 'bun:test';
import { Internationalization, backendErrorTranslationKeys } from './internationalization';
import { frenchTranslations } from './translations/fr';

describe('Internationalization', () => {
  const i18n = new Internationalization();

  test('resolves typed French translation keys', () => {
    expect(i18n.t('common.actions.download')).toBe('Télécharger');
  });

  test('interpolates complete messages', () => {
    expect(i18n.t('customer.documents.confirmation.name', { bookingId: 'ABC-123' })).toBe(
      'Confirmation de réservation ABC-123.pdf',
    );
  });

  test('selects French plural forms', () => {
    expect(i18n.plural('common.nights', 1)).toBe('1 nuit');
    expect(i18n.plural('common.nights', 3)).toBe('3 nuits');
  });

  test('formats dates and euro amounts with the French locale', () => {
    expect(i18n.date('2026-08-31', { day: 'numeric', month: 'long', year: 'numeric' })).toBe(
      '31 août 2026',
    );
    expect(i18n.euros(2_000)).toBe('2 000 €');
  });

  test('maps known backend error tags to frontend translation keys', () => {
    expect(i18n.error({ problem: { error: 'EmailNotVerified' } })).toBe(
      "Votre adresse e-mail n'est pas encore vérifiée. Suivez le lien reçu par e-mail, puis reconnectez-vous.",
    );
    expect(i18n.error({ problem: { _tag: 'PermissionDenied' } })).toBe(
      "Vous n'avez pas l'autorisation d'effectuer cette action.",
    );
    for (const key of Object.values(backendErrorTranslationKeys)) {
      expect(i18n.t(key).length).toBeGreaterThan(0);
    }
  });

  test('uses a translated fallback instead of raw backend messages', () => {
    expect(
      i18n.error(
        { problem: { message: 'database connection string leaked' } },
        'errors.profile.save',
      ),
    ).toBe('Enregistrement impossible.');
  });

  test('keeps every catalog key in use', async () => {
    const sourceRoot = new URL('../', import.meta.url);
    const sourceFiles: string[] = [];
    for await (const file of new Bun.Glob('**/*.ts').scan({ cwd: sourceRoot.pathname })) {
      if (file === 'core/internationalization.test.ts' || file === 'core/translations/fr.ts') continue;
      sourceFiles.push(await Bun.file(new URL(file, sourceRoot)).text());
    }
    const source = sourceFiles.join('\n');
    for (const key of Object.keys(frenchTranslations)) {
      expect(source.includes(`'${key}'`) || source.includes(`"${key}"`), key).toBe(true);
    }
  });
});
