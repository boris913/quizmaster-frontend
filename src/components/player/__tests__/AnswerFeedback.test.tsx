import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerFeedback } from '@/components/player/AnswerFeedback';

const options = [
  { id: 'A', text: 'Londres' },
  { id: 'B', text: 'Paris' },
];

const wrongResult = {
  isCorrect: false,
  pointsEarned: 0,
  maxPoints: 1000,
  timeTakenMs: 4200,
  correctAnswers: [],
  yourAnswers: ['A'],
  status: 'answered' as const,
};

describe('AnswerFeedback', () => {
  it('avant la clôture : résultat seul, pas de correction', () => {
    render(<AnswerFeedback result={wrongResult} options={options} />);
    expect(screen.queryByTestId('answer-reveal')).not.toBeInTheDocument();
    // Sans bonne réponse connue, pas de rappel « Réponse attendue » vide.
    expect(screen.queryByText(/Réponse attendue/)).not.toBeInTheDocument();
  });

  it('après la clôture, avec explication : verdict, rappel et explication', () => {
    render(
      <AnswerFeedback
        result={wrongResult}
        options={options}
        reveal={{
          questionId: 'q1',
          correctAnswers: ['B'],
          explanation: 'Paris est la capitale de la France.',
          yourAnswers: ['A'],
          isCorrect: false,
        }}
      />
    );

    const region = screen.getByRole('region', { name: 'Mauvaise réponse' });
    expect(region).toHaveTextContent('Votre réponse :A. Londres');
    expect(region).toHaveTextContent('Bonne réponse :B. Paris');
    expect(screen.getByTestId('answer-explanation')).toHaveTextContent(
      'ExplicationParis est la capitale de la France.'
    );
    // Le rappel n'est pas affiché deux fois.
    expect(screen.queryByText(/Réponse attendue/)).not.toBeInTheDocument();
  });

  it('après la clôture, sans explication : pas de bloc explication', () => {
    render(
      <AnswerFeedback
        result={{ ...wrongResult, isCorrect: true, pointsEarned: 800, yourAnswers: ['B'] }}
        options={options}
        reveal={{ questionId: 'q1', correctAnswers: ['B'], explanation: null, yourAnswers: ['B'], isCorrect: true }}
      />
    );
    expect(screen.getByRole('region', { name: 'Bonne réponse' })).toBeInTheDocument();
    expect(screen.queryByTestId('answer-explanation')).not.toBeInTheDocument();
  });

  it('joueur sans réponse : « Pas de réponse » et la correction quand même', () => {
    render(
      <AnswerFeedback
        options={options}
        reveal={{ questionId: 'q1', correctAnswers: ['B'], explanation: 'Voir le cours.', yourAnswers: [], isCorrect: false }}
      />
    );
    const region = screen.getByRole('region', { name: 'Pas de réponse' });
    expect(region).toHaveTextContent('Votre réponse :—');
    expect(region).toHaveTextContent('Bonne réponse :B. Paris');
    expect(screen.getByTestId('answer-explanation')).toHaveTextContent('Voir le cours.');
  });
});
