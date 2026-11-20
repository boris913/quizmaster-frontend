import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinPage from '@/app/player/join/page';
import { useSessionStore } from '@/store/sessionStore';
import { JOIN_ERROR_MESSAGES } from '@/lib/nickname';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// Pas de backend : la recherche du mode de pseudo échoue (réseau), le formulaire reste libre.
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async () => {
      throw new Error('Network Error');
    }),
    post: vi.fn(),
  },
}));

const joinSession = vi.fn();

async function submit(pseudo = 'Alice') {
  const user = userEvent.setup();
  render(<JoinPage />);
  await user.type(screen.getByLabelText('Mot de passe de la session'), 'ABC123');
  await user.type(screen.getByLabelText('Votre pseudo'), pseudo);
  await user.click(screen.getByRole('button', { name: 'Rejoindre le quiz' }));
}

describe('Page « Rejoindre » : erreurs du join', () => {
  beforeEach(() => {
    push.mockReset();
    joinSession.mockReset();
    useSessionStore.setState({ joinSession });
  });

  it('400 : affiche le motif du refus renvoyé par le serveur', async () => {
    joinSession.mockRejectedValue({
      response: { status: 400, data: { message: "Ce pseudo n'est pas autorisé. Merci d'en choisir un autre." } },
    });
    await submit('Grossier');
    expect(await screen.findByRole('alert')).toHaveTextContent("Ce pseudo n'est pas autorisé");
    expect(push).not.toHaveBeenCalled();
  });

  it('403 : explique que le participant a été exclu', async () => {
    joinSession.mockRejectedValue({
      response: { status: 403, data: { message: "Vous avez été exclu de cette session par l'enseignant." } },
    });
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(JOIN_ERROR_MESSAGES.kicked);
  });

  it('404 mode async : code d’un devoir, redirige vers la page du devoir', async () => {
    joinSession.mockRejectedValue({
      response: {
        status: 404,
        data: { message: 'Ce code correspond à un devoir : ouvrez-le depuis la page du devoir.', mode: 'async' },
      },
    });
    await submit();
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/player/assignment/ABC123'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('succès : redirige vers la partie', async () => {
    joinSession.mockResolvedValue({
      participant: { id: 'p1', pseudo: 'Alice' },
      session: { id: 's1' },
    });
    await submit();
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/player/game/s1?participantId=p1'));
  });
});
