import { expect, test, type Page } from '@playwright/test';

// Rapport post-session sans backend : l'API REST est simulée et le créateur est
// « connecté » via le stockage persistant de useAuthStore.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const results = {
  session: {
    id: 'report-e2e',
    quizTitle: 'Les fractions',
    status: 'finished',
    startedAt: '2026-11-19T09:00:00.000Z',
    endedAt: '2026-11-19T09:10:00.000Z',
    participantCount: 2,
  },
  summary: { accuracy: 0.5, avgScore: 150, completionRate: 1 },
  perQuestion: [
    {
      questionId: 'q1',
      orderIndex: 0,
      text: 'Combien font 1/2 + 1/4 ?',
      type: 'single',
      accuracy: 0.5,
      avgTimeMs: 3000,
      answerDistribution: { A: 1, B: 1 },
      correctAnswers: ['B'],
    },
    {
      questionId: 'q2',
      orderIndex: 1,
      text: 'Aimez-vous les fractions ?',
      type: 'poll',
      accuracy: 0,
      avgTimeMs: 2000,
      answerDistribution: { A: 2, B: 0 },
      correctAnswers: [],
    },
  ],
  perParticipant: [
    { participantId: 'p1', pseudo: 'Alice', score: 200, accuracy: 1, answered: 2, timeouts: 0, avgTimeMs: 2000 },
    { participantId: 'p2', pseudo: 'Bob', score: 100, accuracy: 0, answered: 2, timeouts: 0, avgTimeMs: 3000 },
  ],
};

async function loginAndMock(page: Page, status = 200) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: { id: 'u1', pseudo: 'prof', created_at: '2026-01-01' },
          token: 'fake-token',
          isAuthenticated: true,
        },
        version: 0,
      })
    );
  });
  await page.route(/\/api\/sessions\/[^/]+\/results$/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? results : { message: 'Session introuvable' }),
    });
  });
}

test.describe('rapport de session', () => {
  test('affiche la synthèse, les questions à retravailler et le tableau élèves', async ({ page }) => {
    await loginAndMock(page);
    await page.goto('/creator/session/report-e2e/results');

    await expect(page.getByRole('heading', { name: 'Les fractions' })).toBeVisible();
    await expect(page.getByText('Précision de la classe')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'À retravailler' })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('Alice');
    await expect(page.getByText('Sondage · non noté')).toBeVisible();
    await expect(page.getByRole('button', { name: /Exporter CSV/ })).toBeEnabled();
  });

  test('mobile : pas de débordement horizontal de la page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await loginAndMock(page);
    await page.goto('/creator/session/report-e2e/results');
    await expect(page.getByRole('heading', { name: 'Les fractions' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test('404 : rapport introuvable', async ({ page }) => {
    await loginAndMock(page, 404);
    await page.goto('/creator/session/inconnue/results');
    await expect(page.getByText('Rapport introuvable')).toBeVisible();
  });
});
