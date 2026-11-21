'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALE_COOKIE, locales, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Sélecteur FR / EN. Écrit le cookie de langue puis relance le rendu serveur :
 * l'URL ne change pas.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const current = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (locale === current) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn('inline-flex h-9 items-center rounded-md p-0.5 text-caption font-semibold', isPending && 'opacity-60', className)}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => choose(locale)}
            aria-pressed={active}
            title={t(locale)}
            className={cn(
              'h-8 rounded-sm px-2 uppercase transition-colors',
              active ? 'bg-ink/[0.07] text-ink' : 'text-ink-tertiary hover:text-ink'
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
