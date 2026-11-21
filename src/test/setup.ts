import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom n'implémente pas matchMedia, utilisé par framer-motion (useReducedMotion).
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// i18n : les composants appellent useTranslations() hors de tout NextIntlClientProvider.
// On branche les vrais messages français, pour que les tests vérifient le texte réellement affiché.
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('../../messages/fr.json')).default;
  return {
    ...actual,
    useLocale: () => 'fr',
    useMessages: () => messages,
    useTranslations: (namespace?: string) =>
      actual.createTranslator({ locale: 'fr', messages, namespace: namespace as never, timeZone: 'Europe/Paris' }),
  };
});

vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl');
  const messages = (await import('../../messages/fr.json')).default;
  return {
    getLocale: async () => 'fr',
    getMessages: async () => messages,
    getTranslations: async (arg?: string | { namespace?: string }) =>
      createTranslator({
        locale: 'fr',
        messages,
        namespace: (typeof arg === 'string' ? arg : arg?.namespace) as never,
        timeZone: 'Europe/Paris',
      }),
  };
});
