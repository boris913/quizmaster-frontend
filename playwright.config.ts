import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * Tests end-to-end.
 *
 * - En local : `npm run test:e2e` démarre `next dev` (ou réutilise un serveur déjà lancé sur le port).
 * - En CI : le job e2e lance `npm run build` avant, puis Playwright démarre `next start`.
 * - Les tests qui ont besoin du backend NestJS sont tagués `@backend` dans leur titre et sont
 *   ignorés tant que `E2E_BACKEND=1` n'est pas défini (pas d'environnement de test en CI pour l'instant).
 */
export default defineConfig({
  testDir: './e2e',
  // En local, `next dev` compile chaque page à la première visite : on laisse plus de marge.
  timeout: isCI ? 30_000 : 120_000,
  expect: { timeout: isCI ? 5_000 : 15_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  grepInvert: process.env.E2E_BACKEND ? undefined : /@backend/,
  use: {
    baseURL,
    // Les tests vérifient le texte français : la langue suit Accept-Language (src/i18n/request.ts).
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: isCI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },
});
