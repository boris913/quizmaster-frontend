import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignmentPlayer } from '@/components/player/AssignmentPlayer';
import api from '@/lib/api';
import { resumeStorageKey } from '@/lib/assignments';

// Parcours multi-étapes avec userEvent : la marge par défaut (5 s) est courte sur les machines lentes.
vi.setConfig({ testTimeout: 30_000 });

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const CODE = 'K7M2P9';

const questions = [
  {
    id: 'q1',
    quiz_id: 'quiz-1',
    text: 'Combien font 2 + 2 ?',
    type: 'single',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '4' },
    ],
    max_points: 1000,
    timer_seconds: 30,
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
    timer_seconds: 30,
    order_index: 1,
    created_at: '',
  },
];
const correct: Record<string, string> = { q1: 'B', q2: 'A' };

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

type Config = { headers: Record<string, string> };

/** Faux backend minimal : progression par jeton, comme le contrat backend#10. */
function mockBackend({ explanations = 'each' as 'each' | 'end' } = {}) {
  const progress = new Map<string, { index: number; score: number; correct: number; answers: string[][] }>();
  vi.mocked(api.post).mockImplementation(async (url: string, body?: unknown, config?: unknown) => {
    if (url === `/assignments/${CODE}/start`) {
      const { pseudo } = body as { pseudo: string };
      if (pseudo === 'Interdit') throw httpError(400, 'Ce pseudo est refusé par le filtre.');
      const token = `tok-${pseudo}`;
      progress.set(token, { index: 0, score: 0, correct: 0, answers: [] });
      return { data: { participantId: `p-${pseudo}`, resumeToken: token } };
    }
    if (url === `/assignments/${CODE}/answer`) {
      const token = (config as Config).headers['X-Resume-Token'];
      const state = progress.get(token);
      if (!state) throw httpError(401, 'Jeton invalide');
      const { questionId, answers } = body as { questionId: string; answers: string[] };
      const isCorrect = answers.length === 1 && answers[0] === correct[questionId];
      state.index += 1;
      state.answers.push(answers);
      if (isCorrect) {
        state.score += 1000;
        state.correct += 1;
      }
      const base = {
        questionId,
        status: 'answered',
        alreadyAnswered: false,
        timeTakenMs: 4200,
        answeredCount: state.index,
        total: questions.length,
        finished: state.index >= questions.length,
      };
      if (explanations === 'end') return { data: { ...base, result: null } };
      return {
        data: {
          ...base,
          result: {
            isCorrect,
            pointsEarned: isCorrect ? 1000 : 0,
            maxPoints: 1000,
            correctAnswers: [correct[questionId]],
            explanation: questionId === 'q1' ? 'Deux plus deux font quatre.' : null,
            totalScore: state.score,
          },
        },
      };
    }
    throw new Error(`POST inattendu : ${url}`);
  });
  vi.mocked(api.get).mockImplementation(async (url: string, config?: unknown) => {
    if (url !== `/assignments/${CODE}/next`) throw httpError(404, 'Devoir introuvable');
    const token = (config as Config).headers['X-Resume-Token'];
    const state = progress.get(token);
    if (!state) throw httpError(401, 'Jeton invalide');
    if (state.index >= questions.length) {
      return {
        data: {
          done: true,
          assignment: { dueAt: '2030-01-10T17:00:00.000Z' },
          total: questions.length,
          score: state.score,
          maxScore: 2000,
          correctCount: state.correct,
          review:
            explanations === 'end'
              ? questions.map((q, i) => ({
                  position: i + 1,
                  question: { id: q.id, text: q.text, type: q.type, options: q.options },
                  yourAnswers: state.answers[i],
                  status: 'answered',
                  isCorrect: state.answers[i]?.[0] === correct[q.id],
                  pointsEarned: 0,
                  timeTakenMs: 1000,
                  correctAnswers: [correct[q.id]],
                  explanation: q.id === 'q1' ? 'Deux plus deux font quatre.' : null,
                }))
              : [],
        },
      };
    }
    return {
      data: {
        done: false,
        assignment: { dueAt: '2030-01-10T17:00:00.000Z' },
        position: state.index + 1,
        total: questions.length,
        answeredCount: state.index,
        question: {
          id: questions[state.index].id,
          text: questions[state.index].text,
          type: questions[state.index].type,
          options: questions[state.index].options,
          imageUrl: null,
          maxPoints: 1000,
          timerSeconds: 30,
        },
        sentAt: new Date().toISOString(),
        timeRemainingMs: 29500,
        score: null,
      },
    };
  });
  return progress;
}

async function answer(user: ReturnType<typeof userEvent.setup>, optionText: string) {
  await user.click(await screen.findByRole('radio', { name: new RegExp(optionText) }));
  await user.click(screen.getByRole('button', { name: 'Valider ma réponse' }));
}

async function start(user: ReturnType<typeof userEvent.setup>, pseudo: string) {
  await user.type(await screen.findByLabelText('Ton pseudo'), pseudo);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
}

describe('AssignmentPlayer : parcours élève', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    window.localStorage.clear();
  });

  it('pseudo -> questions une par une avec correction -> écran de fin', async () => {
    mockBackend();
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);

    await start(user, 'Alice');

    expect(vi.mocked(api.post).mock.calls[0]).toEqual([`/assignments/${CODE}/start`, { pseudo: 'Alice' }]);
    expect(await screen.findByText('Combien font 2 + 2 ?')).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls[0][1]).toEqual({ headers: { 'X-Resume-Token': 'tok-Alice' } });
    expect(screen.getByTestId('assignment-due')).toHaveTextContent('À terminer avant le');

    await answer(user, '4');
    expect(vi.mocked(api.post).mock.calls[1]).toEqual([
      `/assignments/${CODE}/answer`,
      { questionId: 'q1', answers: ['B'] },
      { headers: { 'X-Resume-Token': 'tok-Alice' } },
    ]);
    expect(await screen.findByTestId('answer-explanation')).toHaveTextContent('Deux plus deux font quatre.');
    expect(screen.getByText('Bonne réponse')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Question suivante' }));
    expect(await screen.findByText('Capitale de la France ?')).toBeInTheDocument();
    await answer(user, 'Lyon');
    expect(await screen.findByText('Mauvaise réponse')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir mon résultat' }));
    expect(await screen.findByTestId('assignment-done')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-score')).toHaveTextContent('1000');
    expect(screen.getByText(/1 bonne réponse sur 2/)).toBeInTheDocument();
  });

  it('correction à la fin : « Réponse enregistrée » puis correction complète', async () => {
    mockBackend({ explanations: 'end' });
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);

    await start(user, 'Bob');
    await answer(user, '4');
    expect(await screen.findByText('Réponse enregistrée')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-explanation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Question suivante' }));
    await answer(user, 'Paris');
    await user.click(await screen.findByRole('button', { name: 'Voir mon résultat' }));

    expect(await screen.findByRole('heading', { name: 'Correction' })).toBeInTheDocument();
    expect(screen.getAllByTestId('answer-reveal')).toHaveLength(2);
    expect(screen.getByTestId('answer-explanation')).toHaveTextContent('Deux plus deux font quatre.');
  });

  it('reprend après fermeture de l’onglet grâce au jeton en localStorage', async () => {
    mockBackend();
    const user = userEvent.setup();
    const first = render(<AssignmentPlayer code={CODE} />);
    await start(user, 'Chloe');
    await answer(user, '4');
    await screen.findByTestId('assignment-feedback');

    const stored = JSON.parse(window.localStorage.getItem(resumeStorageKey(CODE)) as string);
    expect(stored).toEqual({ participantId: 'p-Chloe', resumeToken: 'tok-Chloe', pseudo: 'Chloe' });

    // « Fermeture » de l'onglet puis retour : pas de nouveau pseudo, on reprend à la question 2.
    first.unmount();
    vi.mocked(api.post).mockClear();
    render(<AssignmentPlayer code={CODE} />);
    expect(await screen.findByText('Capitale de la France ?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ton pseudo')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('jeton de reprise invalide : retour au pseudo avec un message', async () => {
    mockBackend();
    window.localStorage.setItem(
      resumeStorageKey(CODE),
      JSON.stringify({ participantId: 'x', resumeToken: 'perime', pseudo: 'Zoe' })
    );
    render(<AssignmentPlayer code={CODE} />);
    expect(await screen.findByText(/progression n’a pas pu être retrouvée/)).toBeInTheDocument();
    expect(screen.getByLabelText('Ton pseudo')).toBeInTheDocument();
    expect(window.localStorage.getItem(resumeStorageKey(CODE))).toBeNull();
  });

  it('localStorage indisponible : le parcours fonctionne quand même', async () => {
    mockBackend();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      const user = userEvent.setup();
      render(<AssignmentPlayer code={CODE} />);
      await start(user, 'Dan');
      expect(await screen.findByText('Combien font 2 + 2 ?')).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it('échéance passée : message clair', async () => {
    vi.mocked(api.post).mockRejectedValue(
      Object.assign(new Error('Gone'), {
        response: { status: 410, data: { message: "L'échéance de ce devoir est dépassée.", reason: 'expired' } },
      })
    );
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);
    await start(user, 'Alice');
    const blocked = await screen.findByTestId('assignment-blocked');
    expect(blocked).toHaveTextContent('Échéance passée');
    expect(blocked).toHaveTextContent('il n’est plus possible d’y répondre');
  });

  it('échéance passée pendant le devoir (reprise) : message clair', async () => {
    window.localStorage.setItem(
      resumeStorageKey(CODE),
      JSON.stringify({ participantId: 'p', resumeToken: 'tok', pseudo: 'Eve' })
    );
    vi.mocked(api.get).mockRejectedValue(httpError(410, 'Échéance dépassée'));
    render(<AssignmentPlayer code={CODE} />);
    expect(await screen.findByTestId('assignment-blocked')).toHaveTextContent('Échéance passée');
  });

  it('devoir clos par l’enseignant : message dédié', async () => {
    vi.mocked(api.post).mockRejectedValue(
      Object.assign(new Error('Gone'), {
        response: { status: 410, data: { message: 'Ce devoir a été clôturé.', reason: 'closed' } },
      })
    );
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);
    await start(user, 'Alice');
    expect(await screen.findByTestId('assignment-blocked')).toHaveTextContent('Devoir clos');
  });

  it('code inconnu : message clair', async () => {
    vi.mocked(api.post).mockRejectedValue(httpError(404, 'Session introuvable'));
    const user = userEvent.setup();
    render(<AssignmentPlayer code="ZZZZZZ" />);
    await start(user, 'Alice');
    const blocked = await screen.findByTestId('assignment-blocked');
    expect(blocked).toHaveTextContent('Devoir introuvable');
    expect(blocked).toHaveTextContent('Vérifie le lien');
  });

  it('pseudo refusé : message du serveur sous le champ, on peut corriger', async () => {
    mockBackend();
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);
    const input = await screen.findByLabelText('Ton pseudo');
    await user.type(input, 'Interdit');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByText('Ce pseudo est refusé par le filtre.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByText('Combien font 2 + 2 ?')).toBeInTheDocument();
  });

  it('pseudo invalide localement : aucun appel', async () => {
    const user = userEvent.setup();
    render(<AssignmentPlayer code={CODE} />);
    await start(user, 'ab');
    expect(await screen.findByText('Au moins 3 caractères.')).toBeInTheDocument();
    await waitFor(() => expect(api.post).not.toHaveBeenCalled());
  });
});
