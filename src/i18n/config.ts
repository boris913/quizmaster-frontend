/**
 * Langues prises en charge. Pas de préfixe dans l'URL : la langue est gardée
 * dans un cookie, pour que les liens de session (QR code, /player/join?code=…)
 * restent identiques quelle que soit la langue.
 */
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
