import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QuestionView } from '@/components/player/QuestionView';
import type { Question } from '@/types';

function question(overrides: Partial<Question>): Omit<Question, 'correct_answers'> {
  return {
    id: 'q1',
    quiz_id: 'quiz-1',
    text: 'Question ?',
    type: 'single',
    options: [
      { id: 'A', text: 'Londres' },
      { id: 'B', text: 'Paris' },
    ],
    max_points: 100,
    timer_seconds: 30,
    order_index: 0,
    created_at: '',
    ...overrides,
  };
}

function renderView(q: Omit<Question, 'correct_answers'>) {
  const onAnswer = vi.fn();
  const onSubmit = vi.fn();
  render(
    <QuestionView
      question={q}
      questionNumber={1}
      totalQuestions={3}
      timerSeconds={30}
      onAnswer={onAnswer}
      onSubmit={onSubmit}
    />
  );
  return { onAnswer, onSubmit, validate: () => screen.getByRole('button', { name: /Valider ma réponse|Envoyer mon vote/ }) };
}

describe('QuestionView : rendu et réponse par type', () => {
  it('non-régression choix unique', () => {
    const { onAnswer, validate } = renderView(question({}));
    expect(validate()).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Paris/ }));
    expect(onAnswer).toHaveBeenLastCalledWith(['B']);
    expect(validate()).toBeEnabled();
  });

  it('non-régression choix multiple', () => {
    const { onAnswer } = renderView(question({ type: 'multiple' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Londres/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Paris/ }));
    expect(onAnswer).toHaveBeenLastCalledWith(['A', 'B']);
  });

  it('Vrai/Faux : deux grands boutons, réponse ["true"]', () => {
    const { onAnswer } = renderView(
      question({ type: 'true_false', options: [{ id: 'true', text: 'Vrai' }, { id: 'false', text: 'Faux' }] })
    );
    const group = screen.getByRole('radiogroup');
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: 'Vrai' }));
    expect(onAnswer).toHaveBeenLastCalledWith(['true']);
  });

  it('Vrai/Faux sans options côté serveur : options fixes', () => {
    renderView(question({ type: 'true_false', options: [] }));
    expect(screen.getByRole('radio', { name: 'Vrai' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Faux' })).toBeInTheDocument();
  });

  it('remettre dans l’ordre : ordre initial transmis, réordonnancement au clavier', () => {
    const { onAnswer, validate } = renderView(
      question({
        type: 'ordering',
        options: [
          { id: 'C', text: 'Renaissance' },
          { id: 'A', text: 'Antiquité' },
          { id: 'B', text: 'Moyen Âge' },
        ],
      })
    );
    // L'ordre affiché (mélangé par le serveur) est déjà une réponse valide.
    expect(onAnswer).toHaveBeenLastCalledWith(['C', 'A', 'B']);
    expect(validate()).toBeEnabled();

    const handle = screen.getByRole('button', { name: /Déplacer « Antiquité », position 2 sur 3/ });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onAnswer).toHaveBeenLastCalledWith(['A', 'C', 'B']);
    expect(screen.getByTestId('sortable-announcement')).toHaveTextContent('« Antiquité » déplacé en position 1 sur 3.');

    fireEvent.click(screen.getByRole('button', { name: 'Descendre « Renaissance »' }));
    expect(onAnswer).toHaveBeenLastCalledWith(['A', 'B', 'C']);

    // La poignée est utilisable au doigt : pas de défilement natif dessus.
    expect(handle.className).toContain('touch-none');
  });

  it('réponse courte : champ texte, réponse trimée, Entrée valide', () => {
    const { onAnswer, onSubmit, validate } = renderView(question({ type: 'short_answer', options: [] }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const input = screen.getByLabelText('Votre réponse');
    fireEvent.change(input, { target: { value: '  Rome ' } });
    expect(onAnswer).toHaveBeenLastCalledWith(['Rome']);
    expect(validate()).toBeEnabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(onAnswer).toHaveBeenLastCalledWith([]);
    expect(validate()).toBeDisabled();
  });

  it('sondage : non noté, bouton « Envoyer mon vote »', () => {
    const { onAnswer } = renderView(question({ type: 'poll' }));
    expect(screen.getByText(/Sondage · non noté/)).toBeInTheDocument();
    expect(screen.queryByText('100 pts')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Paris/ }));
    expect(onAnswer).toHaveBeenLastCalledWith(['B']);
    expect(screen.getByRole('button', { name: 'Envoyer mon vote' })).toBeEnabled();
  });

  it('image : <img> paresseuse avec texte alternatif', () => {
    renderView(question({ image_url: 'https://cdn.test/carte.png', text: 'Quel pays ?' }));
    const img = screen.getByRole('img', { name: 'Illustration de la question : Quel pays ?' });
    expect(img).toHaveAttribute('src', 'https://cdn.test/carte.png');
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
