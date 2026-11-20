import { expect, test, type Page, type Route } from '@playwright/test';

// Mode devoir (issue #9) : parcours élève complet avec l'API mockée via page.route.
// Contrat : boris913/quizmaster-backend#10. Aucun backend nécessaire.

const CODE = 'K7M2P9';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const questions = [
  {
    id: 'q1',
    quiz_id: 'quiz-1',
    text: 'Combien font 2 + 2 ?',
    type: 'single',
    options: [
      { id: 'A', text: 'Trois' },
      { id: 'B', text: 'Quatre' },
    ],
    max_points: 1000,
    timer_seconds: 60,
    order_index: 0,
    created_at: '',
  },
  {
    id: 'q2',
    quiz_id: 'quiz-1',
    text: 'Capitale de la France ?',
    type: 'single',
    options: [
      { id: 'A', text: 'Paris' },
      { id: 'B', text: 'Lyon' },
    ],
    max_points: 1000,
    timer_seconds: 60,
    order_index: 1,
    created_at: '',
  },
];
const correct: Record<string, string> = { q1: 'B', q2: 'A' };

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
}

/** Faux backend : un seul élève, progression indexée par jeton. Renvoie le journal des requêtes. */
type FakeState = { index: number; score: number; correct: number; starts: number; tokens: (string | undefined)[] };

async function mockAssignmentApi(
  page: Page,
  state: FakeState = { index: 0, score: 0, correct: 0, starts: 0, tokens: [] }
) {
  const { tokens } = state;
  await page.route(`**/api/assignments/${CODE}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    if (url.pathname.endsWith('/start')) {
      state.starts += 1;
      return json(route, 201, { participantId: 'p-1', resumeToken: 'tok-e2e' });
    }
    tokens.push(request.headers()['x-resume-token']);
    if (url.pathname.endsWith('/next')) {
      if (state.index >= questions.length) {
        return json(route, 200, {
          done: true,
          total: questions.length,
          score: state.score,
          maxScore: 2000,
          correctCount: state.correct,
          review: [],
        });
      }
      const q = questions[state.index];
      return json(route, 200, {
        done: false,
        assignment: { dueAt: '2030-01-10T17:00:00.000Z' },
        position: state.index + 1,
        total: questions.length,
        answeredCount: state.index,
        question: { id: q.id, text: q.text, type: q.type, options: q.options, imageUrl: null, maxPoints: 1000, timerSeconds: 60 },
        sentAt: new Date().toISOString(),
        timeRemainingMs: 60_000,
        score: null,
      });
    }
    if (url.pathname.endsWith('/answer')) {
      const { questionId, answers } = request.postDataJSON() as { questionId: string; answers: string[] };
      const isCorrect = answers[0] === correct[questionId];
      state.index += 1;
      if (isCorrect) {
        state.score += 1000;
        state.correct += 1;
      }
      return json(route, 200, {
        questionId,
        status: 'answered',
        alreadyAnswered: false,
        timeTakenMs: 3000,
        answeredCount: state.index,
        total: questions.length,
        finished: state.index >= questions.length,
        result: {
          isCorrect,
          pointsEarned: isCorrect ? 1000 : 0,
          maxPoints: 1000,
          correctAnswers: [correct[questionId]],
          explanation: questionId === 'q1' ? 'Deux plus deux font quatre.' : null,
          totalScore: state.score,
        },
      });
    }
    return json(route, 404, { message: 'Introuvable' });
  });
  return state;
}

test.describe('mode devoir : parcours élève', () => {
  test('pseudo, questions une par une, reprise après fermeture et écran de fin', async ({ page, context }) => {
    const state = await mockAssignmentApi(page);

    await page.goto(`/player/assignment/${CODE.toLowerCase()}`);
    await page.getByLabel('Ton pseudo').fill('Alice');
    await page.getByRole('button', { name: 'Commencer' }).click();

    await expect(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
    await expect(page.getByTestId('assignment-due')).toContainText('À terminer avant le');
    await page.getByRole('radio', { name: /Quatre/ }).click();
    await page.getByRole('button', { name: 'Valider ma réponse' }).click();
    await expect(page.getByTestId('answer-explanation')).toContainText('Deux plus deux font quatre.');

    // « Fermeture » de l'onglet : nouvel onglet du même navigateur, même lien.
    await page.close();
    const second = await context.newPage();
    // Même faux backend (même progression côté serveur) pour le nouvel onglet.
    await mockAssignmentApi(second, state);
    await second.goto(`/player/assignment/${CODE}`);
    await expect(second.getByText('Capitale de la France ?')).toBeVisible();
    await expect(second.getByLabel('Ton pseudo')).toHaveCount(0);

    await second.getByRole('radio', { name: /Paris/ }).click();
    await second.getByRole('button', { name: 'Valider ma réponse' }).click();
    await second.getByRole('button', { name: 'Voir mon résultat' }).click();
    await expect(second.getByTestId('assignment-done')).toBeVisible();
    await expect(second.getByTestId('assignment-score')).toContainText('2000');
    await expect(second.getByText('2 bonnes réponses sur 2')).toBeVisible();

    expect(state.starts).toBe(1);
    expect(state.tokens.length).toBeGreaterThan(0);
    expect(state.tokens.every((t) => t === 'tok-e2e')).toBe(true);
  });

  test('échéance passée : message clair', async ({ page }) => {
    await page.route(`**/api/assignments/${CODE}/**`, (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: cors })
        : json(route, 410, { statusCode: 410, message: "L'échéance de ce devoir est dépassée.", reason: 'expired' })
    );
    await page.goto(`/player/assignment/${CODE}`);
    await page.getByLabel('Ton pseudo').fill('Alice');
    await page.getByRole('button', { name: 'Commencer' }).click();
    await expect(page.getByRole('heading', { name: 'Échéance passée' })).toBeVisible();
  });

  test('code inconnu : message clair', async ({ page }) => {
    await page.route('**/api/assignments/ZZZZZZ/**', (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: cors })
        : json(route, 404, { message: 'Devoir introuvable. Vérifiez le code.' })
    );
    await page.goto('/player/assignment/ZZZZZZ');
    await page.getByLabel('Ton pseudo').fill('Alice');
    await page.getByRole('button', { name: 'Commencer' }).click();
    await expect(page.getByRole('heading', { name: 'Devoir introuvable' })).toBeVisible();
  });
});
