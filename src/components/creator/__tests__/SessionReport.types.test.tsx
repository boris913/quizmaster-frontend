import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SessionReport } from '@/components/creator/SessionReport';
import type { SessionResults, SessionResultsQuestion } from '@/types';

vi.mock('@/lib/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);

function q(overrides: Partial<SessionResultsQuestion>): SessionResultsQuestion {
  return {
    questionId: 'q',
    orderIndex: 0,
    text: 'Question',
    type: 'single',
    accuracy: 0.5,
    avgTimeMs: 3000,
    answerDistribution: {},
    correctAnswers: [],
    ...overrides,
  };
}

const results: SessionResults = {
  session: {
    id: 's',
    quizTitle: 'Histoire',
    status: 'finished',
    startedAt: '2026-11-19T09:00:00.000Z',
    endedAt: null,
    participantCount: 3,
  },
  summary: { accuracy: 0.5, avgScore: 100, completionRate: 1 },
  perQuestion: [
    q({ questionId: 'q1', orderIndex: 0, text: 'Ordre chronologique', type: 'ordering', accuracy: 0.1, correctAnswers: ['B', 'A'] }),
    q({
      questionId: 'q2',
      orderIndex: 1,
      text: "Capitale de l'Italie ?",
      type: 'short_answer',
      accuracy: 0.3,
      answerDistribution: { Rome: 2, Milan: 1 },
      correctAnswers: ['Rome'],
    }),
    q({ questionId: 'q3', orderIndex: 2, text: 'Thème préféré ?', type: 'poll', accuracy: 0, answerDistribution: { A: 1, B: 2 } }),
    q({ questionId: 'q4', orderIndex: 3, text: 'Le Soleil est une étoile.', type: 'true_false', accuracy: 0.9, answerDistribution: { true: 3, false: 0 }, correctAnswers: ['true'] }),
  ],
  perParticipant: [
    { participantId: 'p1', pseudo: 'Alice', score: 100, accuracy: 0.5, answered: 4, timeouts: 0, avgTimeMs: 3000 },
  ],
};

describe('SessionReport : types de questions (backend #7)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValueOnce({ data: results });
  });

  it('affiche ordre attendu et réponses acceptées dans « À retravailler »', async () => {
    render(<SessionReport sessionId="s" />);
    const cards = await screen.findAllByTestId('review-question');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Ordre chronologique',
      "Capitale de l'Italie ?",
      'Le Soleil est une étoile.',
    ]);
    expect(within(cards[0]).getByTestId('report-ordering')).toHaveTextContent('Ordre attendu');
    expect(within(cards[1]).getByTestId('report-short-answer')).toHaveTextContent('Réponse attendue : Rome');
    expect(within(cards[1]).getByTestId('report-short-answer')).toHaveTextContent('« Milan »');
    expect(within(cards[2]).getByLabelText('Distribution des réponses')).toHaveTextContent('Vrai');
  });

  it('sondage : section dédiée, votes sans bonne réponse ni pourcentage de réussite', async () => {
    render(<SessionReport sessionId="s" />);
    const poll = await screen.findByTestId('poll-question');
    expect(poll).toHaveTextContent('Thème préféré ?');
    expect(poll).toHaveTextContent('non notée');
    expect(within(poll).getByLabelText('Distribution des réponses')).toHaveTextContent('2 élèves');
    expect(poll).not.toHaveTextContent('bonne réponse');
    expect(poll).not.toHaveTextContent('réussite');
  });
});
