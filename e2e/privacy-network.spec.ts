import { expect, test, type Page } from '@playwright/test';

/**
 * Audit des traceurs (#8) : les pages élèves ne doivent déclencher aucune requête vers un
 * domaine tiers (polices Google, analytics, CDN…).
 *
 * Origines autorisées :
 * - l'origine de l'application elle-même ;
 * - l'origine du backend Kwizora (NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL) : c'est notre propre
 *   API, pas un tiers. Le SocketProvider racine ouvre une connexion WebSocket dès le chargement.
 *   Si le backend n'est pas lancé, la tentative échoue, mais elle est tout de même observée ici.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    // ws(s):// -> http(s):// pour comparer avec l'origine HTTP du backend.
    if (u.protocol === 'ws:') u.protocol = 'http:';
    if (u.protocol === 'wss:') u.protocol = 'https:';
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null; // data:, blob:…
    return u.origin;
  } catch {
    return null;
  }
}

function collectThirdPartyRequests(page: Page, appOrigin: string) {
  const allowed = new Set([appOrigin, originOf(API_URL), originOf(WS_URL)].filter(Boolean));
  const offending: string[] = [];
  const check = (url: string) => {
    const origin = originOf(url);
    if (origin && !allowed.has(origin)) offending.push(url);
  };
  page.on('request', (request) => check(request.url()));
  page.on('websocket', (ws) => check(ws.url()));
  return offending;
}

for (const path of ['/player/join', '/confidentialite']) {
  test(`aucune requête vers un domaine tiers sur ${path}`, async ({ page, baseURL }) => {
    const appOrigin = new URL(baseURL ?? 'http://localhost:3000').origin;
    const offending = collectThirdPartyRequests(page, appOrigin);

    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();

    expect(offending, `Requêtes vers des domaines tiers :\n${offending.join('\n')}`).toEqual([]);
  });
}

test('la page de join affiche la mention de confidentialité et son lien', async ({ page }) => {
  await page.goto('/player/join');
  await expect(
    page.getByText("Aucun compte, aucune donnée personnelle demandée. N'utilise pas ton nom complet.")
  ).toBeVisible();
  await page.getByRole('link', { name: 'En savoir plus sur la confidentialité' }).click();
  await expect(page).toHaveURL(/\/confidentialite$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Confidentialité et données des élèves' })
  ).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Confidentialité' })).toBeVisible();
});
