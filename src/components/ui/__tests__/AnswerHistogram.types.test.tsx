import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerHistogram } from '@/components/ui/AnswerHistogram';

const base = { accuracy: 0, answeredCount: 3, totalParticipants: 4 };

describe('AnswerHistogram : types de questions', () => {
  it('sondage : barres sans « Bonne réponse » ni pourcentage de réussite', () => {
    render(
      <AnswerHistogram
        questionType="poll"
        options={[
          { id: 'A', text: 'Volcans' },
          { id: 'B', text: 'Océans' },
        ]}
        stats={{ ...base, distribution: { A: 1, B: 2 }, correctAnswers: [] }}
      />
    );
    expect(screen.getByTestId('histogram-summary')).toHaveTextContent('3 votes sur 4 participants · sondage');
    expect(screen.getByTestId('histogram-summary')).not.toHaveTextContent('répondu juste');
    expect(screen.queryByText('Bonne réponse')).not.toBeInTheDocument();
    expect(screen.getByTestId('histogram-row-B')).toHaveTextContent('67 %');
  });

  it('sondage déduit d’une correction vide quand le type manque', () => {
    render(
      <AnswerHistogram
        options={[{ id: 'A', text: 'Oui' }]}
        stats={{ ...base, distribution: { A: 3 }, correctAnswers: [] }}
      />
    );
    expect(screen.getByTestId('histogram-summary')).not.toHaveTextContent('répondu juste');
  });

  it('remettre dans l’ordre : ordre attendu et réussite, pas de barre par option', () => {
    render(
      <AnswerHistogram
        questionType="ordering"
        options={[
          { id: 'B', text: 'Moyen Âge' },
          { id: 'A', text: 'Antiquité' },
        ]}
        stats={{ ...base, accuracy: 50, distribution: { A: 3, B: 3 }, correctAnswers: ['A', 'B'] }}
      />
    );
    expect(screen.getByTestId('histogram-summary')).toHaveTextContent('50 % des participants ont répondu juste');
    expect(screen.getByTestId('histogram-ordering')).toHaveTextContent('1.Antiquité2.Moyen Âge');
    expect(screen.queryByTestId('histogram-row-A')).not.toBeInTheDocument();
  });

  it('réponse courte : réponses acceptées et réponses fréquentes', () => {
    render(
      <AnswerHistogram
        questionType="short_answer"
        options={[]}
        stats={{ ...base, accuracy: 67, distribution: { rome: 2, Milan: 1 }, correctAnswers: ['Rome'] }}
      />
    );
    expect(screen.getByTestId('histogram-accepted')).toHaveTextContent('Réponse attendue : Rome');
    const rows = screen.getAllByTestId('histogram-short-row');
    expect(rows[0]).toHaveTextContent('« rome »');
    expect(rows[0]).toHaveAttribute('data-correct', 'true');
    expect(rows[1]).not.toHaveAttribute('data-correct');
  });
});

describe('AnswerHistogram : type porté par question:stats (backend #7)', () => {
  it('sans prop questionType, utilise stats.type / stats.graded', () => {
    render(
      <AnswerHistogram
        options={[{ id: 'A', text: 'Un' }, { id: 'B', text: 'Deux' }, { id: 'C', text: 'Trois' }]}
        stats={{ ...base, accuracy: 0, graded: false, type: 'poll', distribution: { A: 1, B: 1, C: 1 }, correctAnswers: [] }}
      />
    );
    expect(screen.getByTestId('histogram-summary')).toHaveTextContent('sondage');
  });

  it('ordering via stats.type, distribution vide', () => {
    render(
      <AnswerHistogram
        options={[{ id: 'A', text: 'Un' }, { id: 'B', text: 'Deux' }, { id: 'C', text: 'Trois' }]}
        stats={{ ...base, accuracy: 33, type: 'ordering', distribution: {}, correctAnswers: ['C', 'A', 'B'] }}
      />
    );
    expect(screen.getByTestId('histogram-ordering')).toHaveTextContent('1.Trois2.Un3.Deux');
  });
});
