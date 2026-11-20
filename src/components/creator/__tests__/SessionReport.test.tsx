import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
// fireEvent plutôt que userEvent : voir DeleteSessionButton.test.tsx (conflit de versions de @testing-library/dom).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SessionReport } from '@/components/creator/SessionReport';
import type { SessionResults } from '@/types';

vi.mock('@/lib/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);

function makeResults(overrides: Partial<SessionResults> = {}): SessionResults {
  return {
    session: {
      id: 'sess-1',
      quizTitle: 'Géographie',
      status: 'finished',
      startedAt: '2026-11-19T09:00:00.000Z',
      endedAt: '2026-11-19T09:10:00.000Z',
      participantCount: 3,
    },
    summary: { accuracy: 0.5, avgScore: 150.33, completionRate: 0.8 },
    perQuestion: [
      {
        questionId: 'q1',
        orderIndex: 0,
        text: 'Capitale de la France ?',
        type: 'single',
        accuracy: 0.9,
        avgTimeMs: 3000,
        answerDistribution: { A: 0, B: 3, C: 0, D: 0 },
        correctAnswers: ['B'],
      },
      {
        questionId: 'q2',
        orderIndex: 1,
        text: 'Plus long fleuve de France ?',
        type: 'single',
        accuracy: 0.2,
        avgTimeMs: 5200,
        answerDistribution: { A: 2, B: 1 },
        correctAnswers: ['B'],
      },
      {
        questionId: 'q3',
        orderIndex: 2,
        text: 'Votre région préférée ?',
        type: 'poll',
        accuracy: 0,
        avgTimeMs: 4000,
        answerDistribution: { A: 1, B: 2 },
        correctAnswers: [],
      },
      {
        questionId: 'q4',
        orderIndex: 3,
        text: 'Combien de départements ?',
        type: 'multiple',
        accuracy: 0.4,
        avgTimeMs: 6000,
        answerDistribution: { A: 1, B: 2 },
        correctAnswers: ['A'],
      },
      {
        questionId: 'q5',
        orderIndex: 4,
        text: 'Point culminant ?',
        type: 'single',
        accuracy: 0.6,
        avgTimeMs: 2000,
        answerDistribution: { A: 2, B: 1 },
        correctAnswers: ['A'],
      },
    ],
    perParticipant: [
      { participantId: 'p1', pseudo: 'Alice', score: 300, accuracy: 0.75, answered: 5, timeouts: 0, avgTimeMs: 4000 },
      { participantId: 'p2', pseudo: 'Chloé', score: 100, accuracy: 0.25, answered: 3, timeouts: 2, avgTimeMs: 2500 },
      { participantId: 'p3', pseudo: 'Bruno', score: 51, accuracy: 0.5, answered: 4, timeouts: 1, avgTimeMs: 6000 },
    ],
    ...overrides,
  };
}

/** Pseudos des lignes du tableau élèves, dans l'ordre affiché. */
function studentOrder(): string[] {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent ?? '');
}

describe('SessionReport', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche un squelette pendant le chargement puis le rapport', async () => {
    mockedGet.mockResolvedValueOnce({ data: makeResults() });
    render(<SessionReport sessionId="sess-1" />);

    expect(screen.getByTestId('report-loading')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Géographie' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/sessions/sess-1/results');
    expect(screen.getByText('Précision de la classe')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('« À retravailler » : les 3 questions notées les moins réussies, sondage exclu, avec histogramme', async () => {
    mockedGet.mockResolvedValueOnce({ data: makeResults() });
    render(<SessionReport sessionId="sess-1" />);

    const cards = await screen.findAllByTestId('review-question');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Plus long fleuve de France ?',
      'Combien de départements ?',
      'Point culminant ?',
    ]);
    expect(within(cards[0]).getByLabelText('Distribution des réponses')).toHaveTextContent('2 élèves');
    expect(within(cards[0]).getByText('(bonne réponse)', { exact: false })).toBeInTheDocument();
  });

  it("n'affiche jamais un sondage comme un score (accuracy 0 ignorée)", async () => {
    mockedGet.mockResolvedValueOnce({ data: makeResults() });
    render(<SessionReport sessionId="sess-1" />);

    await screen.findByRole('heading', { name: 'Géographie' });
    const pollRow = screen
      .getAllByTestId('question-row')
      .find((row) => row.textContent?.includes('Votre région préférée ?'))!;
    expect(pollRow).toHaveTextContent('Sondage · non noté');
    expect(pollRow).not.toHaveTextContent('0 %');
    expect(pollRow).not.toHaveTextContent('réussite');
  });

  it('quiz composé uniquement de sondages : pas de précision de classe ni de colonne Précision', async () => {
    const base = makeResults();
    mockedGet.mockResolvedValueOnce({
      data: makeResults({
        perQuestion: base.perQuestion.filter((q) => q.type === 'poll'),
        summary: { accuracy: 0, avgScore: 0, completionRate: 1 },
      }),
    });
    render(<SessionReport sessionId="sess-1" />);

    await screen.findByRole('heading', { name: 'Géographie' });
    expect(screen.queryByText('Précision de la classe')).not.toBeInTheDocument();
    expect(screen.getByText('Pas de précision')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Précision/ })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('review-question')).toHaveLength(0);
  });

  it('trie le tableau élèves en cliquant sur les en-têtes', async () => {
    mockedGet.mockResolvedValueOnce({ data: makeResults() });
    render(<SessionReport sessionId="sess-1" />);
    await screen.findByRole('table');

    // Par défaut : score décroissant.
    expect(studentOrder()).toEqual(['Alice', 'Chloé', 'Bruno']);
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByRole('button', { name: /Score/ }));
    expect(studentOrder()).toEqual(['Bruno', 'Chloé', 'Alice']);
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(screen.getByRole('button', { name: /Élève/ }));
    expect(studentOrder()).toEqual(['Alice', 'Bruno', 'Chloé']);

    fireEvent.click(screen.getByRole('button', { name: /Précision/ }));
    expect(studentOrder()).toEqual(['Alice', 'Bruno', 'Chloé']);

    fireEvent.click(screen.getByRole('button', { name: /Temps moyen/ }));
    expect(studentOrder()).toEqual(['Chloé', 'Alice', 'Bruno']);

    fireEvent.click(screen.getByRole('button', { name: /Sans réponse/ }));
    expect(studentOrder()).toEqual(['Chloé', 'Bruno', 'Alice']);
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'none');
  });

  it('état vide : aucun participant, export désactivé', async () => {
    mockedGet.mockResolvedValueOnce({
      data: makeResults({
        session: { ...makeResults().session, participantCount: 0 },
        summary: { accuracy: 0, avgScore: 0, completionRate: 0 },
        perParticipant: [],
      }),
    });
    render(<SessionReport sessionId="sess-1" />);

    expect(await screen.findByText('Aucun participant')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exporter CSV/ })).toBeDisabled();
  });

  it('404 (session inexistante ou non-créateur) : message dédié', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 404 } });
    render(<SessionReport sessionId="autre" />);

    expect(await screen.findByText('Rapport introuvable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retour au tableau de bord/ })).toHaveAttribute(
      'href',
      '/creator/dashboard'
    );
    expect(screen.queryByRole('button', { name: /Exporter CSV/ })).not.toBeInTheDocument();
  });

  it('autre erreur : propose de réessayer', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));
    mockedGet.mockResolvedValueOnce({ data: makeResults() });
    render(<SessionReport sessionId="sess-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Réessayer/ }));
    expect(await screen.findByRole('heading', { name: 'Géographie' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  describe('export CSV', () => {
    let createObjectURL: ReturnType<typeof vi.fn<[Blob], string>>;
    let clickSpy: MockInstance<[], void>;
    let downloads: string[];

    beforeEach(() => {
      downloads = [];
      createObjectURL = vi.fn<[Blob], string>(() => 'blob:csv');
      // jsdom n'implémente pas URL.createObjectURL / revokeObjectURL.
      Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement
      ) {
        downloads.push(this.download);
      });
    });

    it("télécharge le CSV via l'API authentifiée (pas un simple lien)", async () => {
      const csv = new Blob(['﻿Rang;Pseudo\r\n1;Alice\r\n'], { type: 'text/csv' });
      mockedGet.mockResolvedValueOnce({ data: makeResults() });
      mockedGet.mockResolvedValueOnce({
        data: csv,
        headers: { 'content-disposition': 'attachment; filename="resultats-geographie-2026-11-19.csv"' },
      });
      render(<SessionReport sessionId="sess-1" />);

      fireEvent.click(await screen.findByRole('button', { name: /Exporter CSV/ }));

      await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
      expect(mockedGet).toHaveBeenLastCalledWith('/sessions/sess-1/results.csv', { responseType: 'blob' });
      expect(createObjectURL).toHaveBeenCalledWith(csv);
      expect(downloads).toEqual(['resultats-geographie-2026-11-19.csv']);
    });

    it("nomme le fichier côté client si Content-Disposition n'est pas exposé (CORS)", async () => {
      mockedGet.mockResolvedValueOnce({ data: makeResults() });
      mockedGet.mockResolvedValueOnce({ data: new Blob(['x']), headers: {} });
      render(<SessionReport sessionId="sess-1" />);

      fireEvent.click(await screen.findByRole('button', { name: /Exporter CSV/ }));
      await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
      expect(downloads).toEqual(['resultats-geographie-2026-11-19.csv']);
    });

    it("affiche une erreur si l'export échoue", async () => {
      mockedGet.mockResolvedValueOnce({ data: makeResults() });
      mockedGet.mockRejectedValueOnce({ response: { status: 500 } });
      render(<SessionReport sessionId="sess-1" />);

      fireEvent.click(await screen.findByRole('button', { name: /Exporter CSV/ }));
      expect(await screen.findByRole('alert')).toHaveTextContent("L'export CSV a échoué");
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
