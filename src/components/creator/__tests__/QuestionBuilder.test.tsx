import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuizForm } from '@/components/creator/QuizForm';

describe('QuestionBuilder : champ explication', () => {
  it('propose une explication facultative limitée à 500 caractères', () => {
    render(<QuizForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter une question/ }));

    const field = screen.getByLabelText('Explication (facultatif)');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveAttribute('maxLength', '500');
    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(field, { target: { value: 'Parce que 1/2 = 2/4.' } });
    expect(screen.getByText('20/500')).toBeInTheDocument();
  });
});
