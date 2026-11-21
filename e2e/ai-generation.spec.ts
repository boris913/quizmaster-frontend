import { expect, test, type Page, type Route } from '@playwright/test';

// Assistant « Générer depuis un cours » (issue #10) : génération -> relecture -> enregistrement,
// avec l'API mockée via page.route. Contrat : boris913/quizmaster-backend#11. Aucun backend nécessaire.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const COURSE =
  'La photosynthèse permet aux plantes de fabriquer leur matière à partir de lumière, d’eau et de dioxyde de carbone. ' +
  'Elle a lieu dans les chloroplastes des feuilles et rejette du dioxygène dans l’atmosphère, ce qui est vital pour les êtres vivants.';

const generated = {
  title: 'La photosynthèse',
  questions: [
    {
      text: 'De quoi la plante a-t-elle besoin pour la photosynthèse ?',
      type: 'single',
      options: [
        { id: 'A', text: 'De lumière' },
        { id: 'B', text: 'De sel' },
      ],
      correct_answers: ['A'],
      explanation: 'La lumière fournit l’énergie.',
    },
    { text: 'La photosynthèse rejette du dioxygène.', type: 'true_false', options: [], correct_answers: ['true'] },
  ],
  rejected: 1,
  source: { type: 'text', chars: 230, used_chars: 230, truncated: false },
  quota: { limit: 3, used: 1, remaining: 2, resets_at: '2026-12-01T12:00:00.000Z' },
};

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
}

async function login(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: { user: { id: 'u1', pseudo: 'prof', created_at: '2026-01-01' }, token: 'fake-token', isAuthenticated: true },
        version: 0,
      })
    );
  });
}

type Log = { generate: { contentType: string; body: string }[]; saves: unknown[] };

async function mockApi(page: Page, generateStatus = 200): Promise<Log> {
  const log: Log = { generate: [], saves: [] };
  // Expression régulière : en glob, « quizzes** » ne traverse pas les « / » (pas de /generate).
  await page.route(/\/api\/quizzes(\/|\?|$)/, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    if (url.pathname.endsWith('/api/quizzes/generate')) {
      log.generate.push({ contentType: request.headers()['content-type'] ?? '', body: request.postData() ?? '' });
      if (generateStatus === 429) {
        return json(route, 429, {
          statusCode: 429,
          message: 'Quota de générations IA atteint (3 par mois).',
          quota: { limit: 3, used: 3, remaining: 0, resets_at: '2026-12-01T12:00:00.000Z' },
        });
      }
      if (generateStatus !== 200) return json(route, generateStatus, { statusCode: generateStatus, message: 'Erreur' });
      return json(route, 200, generated);
    }
    if (url.pathname.endsWith('/api/quizzes') && request.method() === 'POST') {
      log.saves.push(request.postDataJSON());
      return json(route, 201, { id: 'quiz-e2e', title: 'La photosynthèse', questions: [] });
    }
    if (url.pathname.endsWith('/api/quizzes')) return json(route, 200, []);
    return json(route, 200, { id: 'quiz-e2e', title: 'La photosynthèse', questions: [] });
  });
  return log;
}

async function fillForm(page: Page) {
  await page.getByRole('tab', { name: /Générer depuis un cours/ }).click();
  await page.getByLabel('Texte du cours').fill(COURSE);
  await page.getByLabel('Niveau').selectOption('5e');
  await page.getByLabel(/Nombre de questions/).fill('2');
}

test('génère un brouillon, le relit puis l’enregistre explicitement', async ({ page }) => {
  await login(page);
  const log = await mockApi(page);
  await page.goto('/creator/quiz/new');
  await fillForm(page);
  await page.getByRole('button', { name: /Générer le brouillon/ }).click();

  await expect(page.getByTestId('ai-draft-banner')).toContainText('Brouillon généré par IA — à vérifier avant utilisation');
  await expect(page.getByTestId('ai-discarded')).toContainText('1 question a été écartée');
  expect(log.generate).toHaveLength(1);
  expect(log.generate[0].contentType).toMatch(/^multipart\/form-data; boundary=/);
  expect(log.generate[0].body).toContain('name="text"');
  expect(log.generate[0].body).toContain('name="types"');
  expect(log.generate[0].body).not.toContain('name="types[]"');
  // Rien n'est enregistré tant que l'enseignant n'a pas cliqué.
  expect(log.saves).toHaveLength(0);

  await page.getByTestId('question-builder-0').getByLabel('Énoncé').fill('Que faut-il à la plante ?');
  await page.getByRole('button', { name: 'Enregistrer le quiz' }).click();
  await expect(page).toHaveURL(/\/creator\/quiz\/quiz-e2e$/);
  expect(log.saves).toHaveLength(1);
  expect(log.saves[0]).toMatchObject({
    title: 'La photosynthèse',
    questions: [
      { text: 'Que faut-il à la plante ?', type: 'single', correct_answers: ['A'] },
      { type: 'true_false', correct_answers: ['true'] },
    ],
  });
});

test('quota atteint : message avec la limite et la date de remise à zéro', async ({ page }) => {
  await login(page);
  const log = await mockApi(page, 429);
  await page.goto('/creator/quiz/new');
  await fillForm(page);
  await page.getByRole('button', { name: /Générer le brouillon/ }).click();
  const alert = page.getByTestId('ai-error-quota');
  await expect(alert).toContainText('Vous avez utilisé vos 3 générations du mois.');
  await expect(alert).toContainText('1 décembre 2026');
  expect(log.saves).toHaveLength(0);
});

test('IA indisponible (503)', async ({ page }) => {
  await login(page);
  await mockApi(page, 503);
  await page.goto('/creator/quiz/new');
  await fillForm(page);
  await page.getByRole('button', { name: /Générer le brouillon/ }).click();
  await expect(page.getByTestId('ai-error-unavailable')).toContainText('Génération par IA indisponible');
});
