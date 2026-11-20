import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AnswerHistogram, histogramOptions } from '@/components/ui/AnswerHistogram';
import { accuracyToPercent, normalizeQuestionReveal, normalizeQuestionStats } from '@/types';

const options = [
  { id: 'A', text: 'Londres' },
  { id: 'B', text: 'Berlin' },
  { id: 'C', text: 'Paris' },
  { id: 'D', text: 'Madrid' },
];

function row(id: string) {
  return screen.getByTestId(`histogram-row-${id}`);
}

describe('AnswerHistogram', () => {
  it('choix unique : pourcentages par option et bonne réponse mise en évidence', () => {
    render(
      <AnswerHistogram
        options={options}
        stats={{
          distribution: { A: 1, B: 1, C: 6, D: 2 },
          correctAnswers: ['C'],
          accuracy: 50,
          answeredCount: 10,
          totalParticipants: 12,
        }}
      />
    );

    expect(screen.getByRole('figure', { name: 'Répartition des réponses' })).toBeInTheDocument();
    expect(screen.getByTestId('histogram-summary')).toHaveTextContent(
      '10 réponses sur 12 participants · 50 % des participants ont répondu juste'
    );
    expect(row('C')).toHaveTextContent('60 %');
    expect(row('C')).toHaveTextContent('(6 réponses)');
    expect(within(row('C')).getByText('Bonne réponse')).toBeInTheDocument();
    expect(row('C')).toHaveAttribute('data-correct', 'true');
    expect(row('A')).toHaveTextContent('10 %');
    expect(row('A')).toHaveTextContent('(1 réponse)');
    expect(within(row('A')).queryByText('Bonne réponse')).not.toBeInTheDocument();
    expect(screen.getByTestId('histogram-bar-C')).toHaveStyle({ width: '60%' });
    expect(screen.getByTestId('histogram-bar-D')).toHaveStyle({ width: '20%' });
  });

  it('choix multiple : % rapporté aux répondants, plusieurs bonnes réponses', () => {
    render(
      <AnswerHistogram
        options={options}
        stats={{
          distribution: { A: 4, B: 3, C: 1 },
          correctAnswers: ['A', 'B'],
          accuracy: 50,
          answeredCount: 4,
          totalParticipants: 4,
        }}
      />
    );

    expect(row('A')).toHaveTextContent('100 %');
    expect(row('B')).toHaveTextContent('75 %');
    expect(row('D')).toHaveTextContent('0 %');
    expect(screen.getAllByText('Bonne réponse')).toHaveLength(2);
    expect(screen.getByTestId('histogram-summary')).toHaveTextContent('50 % des participants ont répondu juste');
  });

  it('aucune réponse : 0 % partout, sans division par zéro', () => {
    render(
      <AnswerHistogram
        options={options}
        stats={{ distribution: {}, correctAnswers: ['C'], accuracy: 0, answeredCount: 0, totalParticipants: 3 }}
      />
    );

    expect(screen.getByTestId('histogram-summary')).toHaveTextContent('Aucune réponse sur 3 participants');
    options.forEach((o) => expect(row(o.id)).toHaveTextContent('0 %'));
    expect(screen.getByTestId('histogram-bar-C')).toHaveStyle({ width: '0%' });
  });

  it("n'affiche aucun pseudo, seulement des agrégats", () => {
    const { container } = render(
      <AnswerHistogram
        options={options}
        stats={{ distribution: { A: 1 }, correctAnswers: ['A'], accuracy: 100, answeredCount: 1, totalParticipants: 1 }}
      />
    );
    expect(container.textContent).not.toMatch(/Alice|Bob/);
  });

  it('déduit les options de la distribution quand la question est inconnue', () => {
    expect(histogramOptions([], { distribution: { B: 1, A: 2 }, correctAnswers: ['C'] }).map((o) => o.id)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });
});

describe('contrat question:stats / question:reveal', () => {
  it('accuracy est un pourcentage entier borné à 0..100', () => {
    expect(accuracyToPercent(1)).toBe(1);
    expect(accuracyToPercent(75)).toBe(75);
    expect(accuracyToPercent(140)).toBe(100);
    expect(accuracyToPercent(undefined)).toBe(0);
  });

  it('normalise question:stats (camelCase et snake_case)', () => {
    expect(
      normalizeQuestionStats({
        questionId: 'q1',
        distribution: { A: 2 },
        correctAnswers: ['A'],
        accuracy: 1,
        answeredCount: 2,
        totalParticipants: 3,
      })
    ).toEqual({ questionId: 'q1', distribution: { A: 2 }, correctAnswers: ['A'], accuracy: 1, answeredCount: 2, totalParticipants: 3 });
    expect(normalizeQuestionStats({ question_id: 'q2', correct_answers: ['B'], answered_count: 1 })).toMatchObject({
      questionId: 'q2',
      correctAnswers: ['B'],
      answeredCount: 1,
      distribution: {},
    });
    expect(normalizeQuestionStats({})).toBeNull();
  });

  it('normalise question:reveal et ignore une explication vide', () => {
    expect(
      normalizeQuestionReveal({ questionId: 'q1', correctAnswers: ['A'], explanation: '  ', yourAnswers: ['B'], isCorrect: false })
    ).toEqual({ questionId: 'q1', correctAnswers: ['A'], explanation: null, yourAnswers: ['B'], isCorrect: false });
  });
});
