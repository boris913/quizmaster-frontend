import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinForm } from '@/components/player/JoinForm';
import { fetchNicknameSuggestions } from '@/lib/nickname';

vi.mock('@/lib/nickname', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nickname')>()),
  fetchNicknameSuggestions: vi.fn(),
}));

const fetchSuggestions = vi.mocked(fetchNicknameSuggestions);

// jsdom n'a pas PointerEvent, que framer-motion (Button) utilise pour les appuis clavier
// (Entrée / Espace sur un bouton animé).
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  }
  Object.defineProperty(window, 'PointerEvent', { writable: true, value: PointerEventPolyfill });
  Object.defineProperty(globalThis, 'PointerEvent', { writable: true, value: PointerEventPolyfill });
}

/** Erreur réseau (pas de réponse) : le formulaire reste en saisie libre. */
const networkError = () => Object.assign(new Error('Network Error'), { response: undefined });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

function setSearch(search: string) {
  window.history.replaceState(null, '', `/player/join${search ? `?${search}` : ''}`);
}

const codeInput = () => screen.getByLabelText('Code de la session') as HTMLInputElement;
const pseudoInput = () => screen.getByLabelText('Ton pseudo') as HTMLInputElement;

describe('JoinForm', () => {
  beforeEach(() => {
    setSearch('');
    fetchSuggestions.mockReset();
    fetchSuggestions.mockRejectedValue(networkError());
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

    expect(await screen.findByText('Entre le code de la session')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe('validation du pseudo (alignée sur le backend)', () => {
    it.each(['Loutre Curieuse', 'Éléonore', 'Zoé_42', 'Jean-Luc'])('accepte « %s »', async (pseudo) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<JoinForm onSubmit={onSubmit} />);

      await user.type(codeInput(), 'ABC123');
      await user.type(pseudoInput(), pseudo);
      await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].pseudo).toBe(pseudo);
    });

    it.each([
      ['Al', 'Minimum 3 caractères'],
      ['Loutre  Curieuse', 'Lettres, chiffres, - et _ uniquement, avec un seul espace entre les mots'],
      ['Alice!', 'Lettres, chiffres, - et _ uniquement, avec un seul espace entre les mots'],
    ])('refuse « %s »', async (pseudo, message) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinForm onSubmit={onSubmit} />);

      await user.type(codeInput(), 'ABC123');
      await user.type(pseudoInput(), pseudo);
      await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('retire les espaces en début et fin de pseudo', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<JoinForm onSubmit={onSubmit} />);

      await user.type(codeInput(), 'ABC123');
      await user.type(pseudoInput(), '  Alice  ');
      await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].pseudo).toBe('Alice');
    });
  });

  describe('mode « pseudos générés » (roulette)', () => {
    const suggestions = ['Loutre Curieuse', 'Hibou Malin', 'Panda Rapide'];

    it('interroge le serveur avec le code de l’URL et affiche la roulette', async () => {
      setSearch('code=abc123');
      fetchSuggestions.mockResolvedValue({ nickname_mode: 'generated', suggestions });
      render(<JoinForm onSubmit={vi.fn()} />);

      expect(
        await screen.findByRole('button', { name: /Lancer la roulette \(3 essais restants\)/ })
      ).toBeInTheDocument();
      expect(fetchSuggestions).toHaveBeenCalledWith('ABC123');
      // Plus de saisie libre du pseudo.
      expect(screen.queryByRole('textbox', { name: 'Ton pseudo' })).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Ton pseudo' })).toBeInTheDocument();
    });

    it('affiche un état de chargement pendant la recherche de la session', async () => {
      setSearch('code=abc123');
      let resolve!: (value: { nickname_mode: 'generated'; suggestions: string[] }) => void;
      fetchSuggestions.mockReturnValue(new Promise((r) => (resolve = r)));
      render(<JoinForm onSubmit={vi.fn()} />);

      expect(await screen.findByRole('status')).toHaveTextContent('Recherche de la session');
      resolve({ nickname_mode: 'generated', suggestions });
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    });

    it('permet 3 tirages au clavier puis bloque, et soumet le dernier pseudo tiré', async () => {
      setSearch('code=abc123');
      fetchSuggestions.mockResolvedValue({ nickname_mode: 'generated', suggestions });
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<JoinForm onSubmit={onSubmit} />);

      const spin = await screen.findByRole('button', { name: /Lancer la roulette/ });
      const value = screen.getByTestId('nickname-roulette-value');
      expect(value).toHaveAttribute('aria-live', 'polite');

      // Tab depuis le champ code jusqu'au bouton de la roulette, puis Entrée.
      codeInput().focus();
      await user.tab();
      expect(spin).toHaveFocus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(value).toHaveTextContent('Loutre Curieuse'));
      expect(spin).toHaveAccessibleName(/Tirer un autre pseudo \(2 essais restants\)/);

      // Espace : deuxième tirage.
      await user.keyboard(' ');
      await waitFor(() => expect(value).toHaveTextContent('Hibou Malin'));
      await user.keyboard('{Enter}');
      await waitFor(() => expect(value).toHaveTextContent('Panda Rapide'));

      expect(spin).toBeDisabled();
      expect(spin).toHaveAccessibleName(/0 essai restant/);
      expect(screen.getByText(/Plus d.essais/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0]).toEqual({ password: 'ABC123', pseudo: 'Panda Rapide' });
      expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    });

    it('demande de lancer la roulette avant de rejoindre', async () => {
      setSearch('code=abc123');
      fetchSuggestions.mockResolvedValue({ nickname_mode: 'generated', suggestions });
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<JoinForm onSubmit={onSubmit} />);

      await screen.findByRole('button', { name: /Lancer la roulette/ });
      await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));

      expect(await screen.findByText('Lance la roulette pour obtenir ton pseudo', { selector: '#nickname-roulette-error' }))
        .toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('propose une nouvelle roulette après un refus du serveur', async () => {
      setSearch('code=abc123');
      fetchSuggestions
        .mockResolvedValueOnce({ nickname_mode: 'generated', suggestions })
        .mockResolvedValueOnce({ nickname_mode: 'generated', suggestions: ['Renard Calme', 'Ours Brun', 'Lynx Vif'] });
      const user = userEvent.setup();
      const { rerender } = render(<JoinForm onSubmit={vi.fn()} />);

      await user.click(await screen.findByRole('button', { name: /Lancer la roulette/ }));
      rerender(<JoinForm onSubmit={vi.fn()} error="Ce pseudo est déjà utilisé dans cette session" />);

      await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledTimes(2));
      const spin = await screen.findByRole('button', { name: /Lancer la roulette \(3 essais restants\)/ });
      await user.click(spin);
      await waitFor(() => expect(screen.getByTestId('nickname-roulette-value')).toHaveTextContent('Renard Calme'));
    });

    it('mode libre : garde le champ pseudo', async () => {
      setSearch('code=abc123');
      fetchSuggestions.mockResolvedValue({ nickname_mode: 'free', suggestions });
      render(<JoinForm onSubmit={vi.fn()} />);

      await waitFor(() => expect(fetchSuggestions).toHaveBeenCalled());
      expect(pseudoInput()).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /roulette/ })).not.toBeInTheDocument();
    });
  });

  it('code inconnu (404) : message explicite sous le champ code', async () => {
    setSearch('code=zzz999');
    fetchSuggestions.mockRejectedValue(httpError(404));
    render(<JoinForm onSubmit={vi.fn()} />);

    expect(await screen.findByText('Session introuvable ou terminée. Vérifie le code.')).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('affiche l’erreur du join dans une alerte', () => {
    render(<JoinForm onSubmit={vi.fn()} error="Ce pseudo n'est pas autorisé." />);
    expect(screen.getByRole('alert')).toHaveTextContent("Ce pseudo n'est pas autorisé.");
  });
});
