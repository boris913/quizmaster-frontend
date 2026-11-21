import { expect, test, type Page, type Route } from '@playwright/test';

// Quiz partagé (issue #11) : aperçu public, connexion puis retour, copie dans son compte.
// Contrat : boris913/quizmaster-backend#12. API mockée via page.route, aucun backend nécessaire.

const TOKEN = 'tok123';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
}

const preview = {
  title: 'Les volcans',
  description: 'Révisions de 5e',
  question_count: 2,
  questions: [
    { text: 'Quel volcan est en Sicile ?', type: 'single', options: [{ id: 'A', text: 'Etna' }, { id: 'B', text: 'Fuji' }] },
    { text: 'Nom du volcan d’Auvergne ?', type: 'short_answer', options: [] },
  ],
};

const copiedQuiz = {
  id: 'quiz-9',
  title: 'Les volcans',
  description: 'Révisions de 5e',
  total_questions: 0,
  use_global_timer: true,
  global_timer_seconds: 30,
  questions: [],
};

async function mockApi(page: Page, { revoked = false } = {}) {
  const log = { copies: 0, copyAuth: [] as (string | undefined)[] };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const { pathname } = new URL(request.url());
    if (pathname.endsWith('/api/auth/login')) {
      return json(route, 201, { access_token: 'jwt-e2e', user: { id: 'u1', pseudo: 'prof', created_at: '' } });
    }
    if (pathname.endsWith(`/api/quizzes/shared/${TOKEN}`)) {
      return revoked
        ? json(route, 404, { statusCode: 404, message: 'Lien de partage invalide ou révoqué' })
        : json(route, 200, preview);
    }
    if (pathname.endsWith(`/api/quizzes/shared/${TOKEN}/copy`)) {
      log.copies += 1;
      log.copyAuth.push(request.headers()['authorization']);
      return json(route, 201, { quiz: { id: 'quiz-9' }, warnings: [] });
    }
    if (pathname.endsWith('/api/quizzes/quiz-9')) return json(route, 200, copiedQuiz);
    if (pathname.endsWith('/api/quizzes')) return json(route, 200, [copiedQuiz]);
    return json(route, 404, { message: 'Introuvable' });
  });
  return log;
}

test.describe('quiz partagé', () => {
  test('aperçu sans réponses, connexion puis retour, copie dans mes quiz', async ({ page }) => {
    const log = await mockApi(page);

    await page.goto(`/creator/quiz/shared/${TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Les volcans' })).toBeVisible();
    await expect(page.getByTestId('shared-summary')).toContainText('2 questions');
    await expect(page.getByText('Quel volcan est en Sicile ?')).toBeVisible();
    await expect(page.getByTestId('shared-question')).toHaveCount(2);

    await page.getByRole('button', { name: 'Ajouter à mes quiz' }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcreator%2Fquiz%2Fshared%2Ftok123$/);
    expect(log.copies).toBe(0);

    await page.getByPlaceholder('Votre pseudo').fill('prof');
    await page.getByPlaceholder('••••••••').fill('secret');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(new RegExp(`/creator/quiz/shared/${TOKEN}$`));
    await page.getByRole('button', { name: 'Ajouter à mes quiz' }).click();
    await expect(page).toHaveURL(/\/creator\/quiz\/quiz-9$/);
    expect(log.copies).toBe(1);
    expect(log.copyAuth[0]).toBe('Bearer jwt-e2e');
  });

  test('lien révoqué : message clair', async ({ page }) => {
    await mockApi(page, { revoked: true });
    await page.goto(`/creator/quiz/shared/${TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Lien de partage invalide' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter à mes quiz' })).toHaveCount(0);
  });
});
