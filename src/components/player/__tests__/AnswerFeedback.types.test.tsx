import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerFeedback } from '@/components/player/AnswerFeedback';

const result = {
  isCorrect: false,
  pointsEarned: 0,
  maxPoints: 100,
  timeTakenMs: 2000,
  correctAnswers: [],
  yourAnswers: ['A'],
  status: 'answered' as const,
};

describe('AnswerFeedback : types de questions', () => {
  it('sondage (type explicite) : vote enregistré, ni verdict ni points', () => {
    render(
      <AnswerFeedback
        questionType="poll"
        result={result}
        options={[{ id: 'A', text: 'Volcans' }]}
        reveal={{ questionId: 'q', correctAnswers: [], explanation: null, yourAnswers: ['A'], isCorrect: false }}
      />
    );
    expect(screen.getByTestId('poll-feedback')).toHaveTextContent('Vote enregistré');
    expect(screen.getByTestId('poll-feedback')).toHaveTextContent('Volcans');
    expect(screen.queryByText(/Mauvaise réponse/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });

  it('sondage déduit d’une correction vide (appelant sans type, ex. mode devoir)', () => {
    render(
      <AnswerFeedback
        options={[{ id: 'A', text: 'Volcans' }, { id: 'B', text: 'Océans' }]}
        reveal={{ questionId: 'q', correctAnswers: [], explanation: null, yourAnswers: ['B'], isCorrect: false }}
      />
    );
    expect(screen.getByTestId('poll-feedback')).toBeInTheDocument();
  });

  it('remettre dans l’ordre : ordre attendu lisible', () => {
    render(
      <AnswerFeedback
        questionType="ordering"
        options={[
          { id: 'A', text: 'Antiquité' },
          { id: 'B', text: 'Moyen Âge' },
        ]}
        reveal={{ questionId: 'q', correctAnswers: ['A', 'B'], explanation: null, yourAnswers: ['B', 'A'], isCorrect: false }}
      />
    );
    expect(screen.getByText('Ordre attendu :')).toBeInTheDocument();
    expect(screen.getByText('1. Antiquité → 2. Moyen Âge')).toBeInTheDocument();
    expect(screen.getByText('1. Moyen Âge → 2. Antiquité')).toBeInTheDocument();
  });

  it('réponse courte : réponse tapée et variantes acceptées', () => {
    render(
      <AnswerFeedback
        options={[]}
        reveal={{ questionId: 'q', correctAnswers: ['Rome', 'Roma'], explanation: null, yourAnswers: ['rome.'], isCorrect: true }}
      />
    );
    expect(screen.getByText('Réponses acceptées :')).toBeInTheDocument();
    expect(screen.getByText('Rome / Roma')).toBeInTheDocument();
    expect(screen.getByText('rome.')).toBeInTheDocument();
  });

  it('Vrai/Faux : libellés plutôt que true/false', () => {
    render(
      <AnswerFeedback
        options={[{ id: 'true', text: 'Vrai' }, { id: 'false', text: 'Faux' }]}
        reveal={{ questionId: 'q', correctAnswers: ['false'], explanation: null, yourAnswers: ['true'], isCorrect: false }}
      />
    );
    expect(screen.getByText('Vrai')).toBeInTheDocument();
    expect(screen.getByText('Faux')).toBeInTheDocument();
  });
});

describe('AnswerFeedback : type porté par question:reveal (backend #7)', () => {
  it('ordering sans prop questionType : reveal.type suffit', () => {
    render(
      <AnswerFeedback
        options={[{ id: 'A', text: 'Un' }, { id: 'B', text: 'Deux' }, { id: 'C', text: 'Trois' }]}
        reveal={{ questionId: 'q', type: 'ordering', graded: true, correctAnswers: ['B', 'A', 'C'], explanation: null, yourAnswers: ['B', 'A', 'C'], isCorrect: true }}
      />
    );
    expect(screen.getByText('Ordre attendu :')).toBeInTheDocument();
  });

  it('graded: false = sondage', () => {
    render(
      <AnswerFeedback
        options={[{ id: 'A', text: 'Un' }]}
        reveal={{ questionId: 'q', type: 'poll', graded: false, correctAnswers: [], explanation: null, yourAnswers: ['A'], isCorrect: false }}
      />
    );
    expect(screen.getByTestId('poll-feedback')).toBeInTheDocument();
  });
});
