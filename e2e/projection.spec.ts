import { expect, test, type Page } from '@playwright/test';

// Écran de projection sans backend : l'API REST est simulée, le socket ne se connecte pas
// (le lobby s'affiche quand même avec les données REST).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function mockApi(page: Page) {
  await page.route(/\/api\/sessions\/session-e2e(\/participants)?$/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/participants')
      ? [
          { id: 'p1', pseudo: 'Alice', score: 0, status: 'waiting' },
          { id: 'p2', pseudo: 'Bob', score: 0, status: 'waiting' },
        ]
      : {
          id: 'session-e2e',
          password: 'K7M2P9',
          status: 'waiting',
          current_question_index: -1,
          quizzes: { title: 'Les fractions', total_questions: 3 },
        };
    await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test.describe('écran de projection', () => {
  test('16:9 : code ≥ 120 px, QR code et participants, sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await mockApi(page);
    await page.goto('/creator/session/session-e2e/present');

    const code = page.getByTestId('session-code');
    await expect(code).toHaveText('K7M2P9');
    const fontSize = await code.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(120);

    const qr = page.getByTestId('join-qr');
    await expect(qr.locator('svg')).toBeVisible();
    await expect(qr).toHaveAttribute('data-url', /\/player\/join\?code=K7M2P9$/);

    await expect(page.getByTestId('participant-count')).toHaveText('2');
    await expect(page.getByText('Alice')).toBeVisible();

    // Aucun contrôle de jeu sur l'écran de projection.
    for (const name of [/lancer/i, /pause/i, /suivante/i, /terminer/i]) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }

    const overflow = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="projection-screen"]') as HTMLElement;
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    });
    expect(overflow).toBe(false);
  });
});
