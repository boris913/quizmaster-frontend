import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

/** Langue de la requête : cookie choisi par l'utilisateur, sinon navigateur, sinon français. */
function resolveLocale(): Locale {
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = headers().get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Europe/Paris',
  };
});
