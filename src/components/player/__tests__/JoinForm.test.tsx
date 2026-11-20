import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinForm } from '@/components/player/JoinForm';

function setSearch(search: string) {
  window.history.replaceState(null, '', `/player/join${search ? `?${search}` : ''}`);
}

const codeInput = () => screen.getByLabelText('Mot de passe de la session') as HTMLInputElement;
const pseudoInput = () => screen.getByLabelText('Votre pseudo') as HTMLInputElement;

describe('JoinForm', () => {
  beforeEach(() => {
    setSearch('');
  });

  it('pré-remplit le code depuis ?code= et place le focus sur le pseudo', async () => {
    setSearch('code=abc123');
    render(<JoinForm onSubmit={vi.fn()} />);

    await waitFor(() => expect(codeInput()).toHaveValue('ABC123'));
    await waitFor(() => expect(pseudoInput()).toHaveFocus());
  });

  it('normalise le code de l’URL (majuscules, sans espaces)', async () => {
    setSearch('code=%20k7m%202p9%20');
    render(<JoinForm onSubmit={vi.fn()} />);
    await waitFor(() => expect(codeInput()).toHaveValue('K7M2P9'));
  });

  it('sans ?code=, le champ est vide et le focus n’est pas déplacé', () => {
    render(<JoinForm onSubmit={vi.fn()} />);
    expect(codeInput()).toHaveValue('');
    expect(pseudoInput()).not.toHaveFocus();
  });

  it('normalise le code à la saisie et soumet la valeur normalisée', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JoinForm onSubmit={onSubmit} />);

    await user.type(codeInput(), 'ab c 12 3');
    expect(codeInput()).toHaveValue('ABC123');
    await user.type(pseudoInput(), 'Alice_42');
    await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ password: 'ABC123', pseudo: 'Alice_42' });
  });

  it('soumet directement avec le code pré-rempli (sans dépendre d’une longueur fixe)', async () => {
    setSearch('code=QZ7KM');
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JoinForm onSubmit={onSubmit} />);

    await waitFor(() => expect(pseudoInput()).toHaveFocus());
    await user.keyboard('Bob{Enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ password: 'QZ7KM', pseudo: 'Bob' });
  });

  it('refuse un code vide', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<JoinForm onSubmit={onSubmit} />);

    await user.type(pseudoInput(), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

    expect(await screen.findByText('Entrez le code de la session')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
