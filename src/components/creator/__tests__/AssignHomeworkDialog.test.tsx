import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignHomeworkDialog } from '@/components/creator/AssignHomeworkDialog';
import api from '@/lib/api';
import { toDateTimeLocalValue } from '@/lib/assignments';

// Parcours multi-étapes avec userEvent : la marge par défaut (5 s) est courte sur les machines lentes.
vi.setConfig({ testTimeout: 30_000 });

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

function setDue(date: Date) {
  fireEvent.change(screen.getByLabelText('Échéance'), { target: { value: toDateTimeLocalValue(date) } });
}

describe('AssignHomeworkDialog', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockImplementation(async (_url: string, body?: unknown) => ({
      data: {
        id: 'session-9',
        password: 'K7M2P9',
        mode: 'async',
        due_at: (body as { dueAt: string }).dueAt,
        status: 'waiting',
      },
    }));
  });

  it('valeurs par défaut : Précision et explications après chaque question', () => {
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Précision' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Vitesse' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Après chaque question' })).toBeChecked();
    expect((screen.getByLabelText('Échéance') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('envoie le payload du mode devoir puis affiche le lien et le QR', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} onCreated={onCreated} />);

    const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    due.setSeconds(0, 0);
    setDue(due);
    await user.click(screen.getByRole('radio', { name: 'Vitesse' }));
    await user.click(screen.getByRole('radio', { name: 'À la fin du devoir' }));
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.post).mock.calls[0]).toEqual([
      '/sessions',
      {
        quiz_id: 'quiz-1',
        mode: 'async',
        dueAt: due.toISOString(),
        scoringMode: 'speed',
        showExplanations: 'end',
      },
    ]);

    expect(await screen.findByTestId('assignment-created')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-link')).toHaveTextContent(
      `${window.location.origin}/player/assignment/K7M2P9`
    );
    await waitFor(() =>
      expect(screen.getByTestId('join-qr')).toHaveAttribute(
        'data-url',
        `${window.location.origin}/player/assignment/K7M2P9`
      )
    );
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-9' }));
  });

  it('copie le lien du devoir', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));
    await screen.findByTestId('assignment-created');
    await waitFor(() => expect(screen.getByTestId('assignment-link')).not.toBeEmptyDOMElement());

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/player/assignment/K7M2P9`);
    expect(await screen.findByText('Copié')).toBeInTheDocument();
  });

  it('refuse une échéance à moins de 15 minutes', async () => {
    const user = userEvent.setup();
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} />);
    setDue(new Date(Date.now() + 5 * 60 * 1000));
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('au moins 15 minutes');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuse une échéance passée ou vide', async () => {
    const user = userEvent.setup();
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} />);
    setDue(new Date(Date.now() - 60 * 60 * 1000));
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('au moins 15 minutes');

    fireEvent.change(screen.getByLabelText('Échéance'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Indiquez une date');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('affiche le message du serveur en cas d’échec', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 400, data: { message: 'dueAt invalide' } } });
    const user = userEvent.setup();
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Créer le devoir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('dueAt invalide');
  });

  it('Échap ferme la modale', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AssignHomeworkDialog quizId="quiz-1" onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
