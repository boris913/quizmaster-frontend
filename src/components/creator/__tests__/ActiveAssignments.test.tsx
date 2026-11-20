import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveAssignments } from '@/components/creator/ActiveAssignments';
import api from '@/lib/api';
import { toDateTimeLocalValue } from '@/lib/assignments';
import { useSessionStore } from '@/store/sessionStore';
import type { Session } from '@/types';

// Parcours multi-étapes avec userEvent : la marge par défaut (5 s) est courte sur les machines lentes.
vi.setConfig({ testTimeout: 30_000 });

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const DAY = 24 * 60 * 60 * 1000;

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: 's',
    quiz_id: 'quiz-1',
    creator_id: 'c',
    password: 'ABC234',
    status: 'waiting',
    current_question_index: 0,
    created_at: '',
    quizzes: { title: 'Les fractions' },
    mode: 'async',
    due_at: new Date(Date.now() + 2 * DAY).toISOString(),
    ...overrides,
  };
}

function Harness() {
  const sessions = useSessionStore((s) => s.sessions);
  return <ActiveAssignments sessions={sessions} />;
}

describe('ActiveAssignments (« Devoirs en cours »)', () => {
  beforeEach(() => {
    vi.mocked(api.patch).mockReset();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 'a1', completed_count: 3, participant_count: 5 }),
        makeSession({ id: 'live', mode: 'live', due_at: null, quizzes: { title: 'Direct' } }),
        makeSession({ id: 'closed', status: 'finished', quizzes: { title: 'Clos' } }),
      ],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liste uniquement les devoirs non clos, avec complétion, échéance et rapport', () => {
    render(<Harness />);
    const rows = screen.getAllByTestId('assignment-row');
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(within(row).getByText('Les fractions')).toBeInTheDocument();
    expect(within(row).getByText(/3 \/ 5 élèves ont terminé/)).toBeInTheDocument();
    expect(within(row).getByText(/Échéance :/)).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Voir le rapport : Les fractions' })).toHaveAttribute(
      'href',
      '/creator/session/a1/results'
    );
  });

  it('ne rend rien sans devoir en cours', () => {
    useSessionStore.setState({ sessions: [] });
    const { container } = render(<Harness />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prolonger : PATCH dueAt puis mise à jour de l’échéance', async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockImplementation(async (_url: string, body?: unknown) => ({
      data: { id: 'a1', due_at: (body as { dueAt: string }).dueAt },
    }));
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Prolonger' }));
    const field = screen.getByLabelText('Nouvelle échéance');
    const newDue = new Date(Date.now() + 5 * DAY);
    newDue.setSeconds(0, 0);
    fireEvent.change(field, { target: { value: toDateTimeLocalValue(newDue) } });
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.patch).mock.calls[0]).toEqual(['/sessions/a1', { dueAt: newDue.toISOString() }]);
    await waitFor(() =>
      expect(useSessionStore.getState().sessions.find((s) => s.id === 'a1')?.due_at).toBe(newDue.toISOString())
    );
    expect(screen.queryByLabelText('Nouvelle échéance')).not.toBeInTheDocument();
  });

  it('prolonger : refuse une échéance antérieure à l’actuelle', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Prolonger' }));
    fireEvent.change(screen.getByLabelText('Nouvelle échéance'), {
      target: { value: toDateTimeLocalValue(new Date(Date.now() + DAY)) },
    });
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('postérieure à l’échéance actuelle');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('clore : confirmation, PATCH status finished, le devoir disparaît', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'a1', status: 'finished' } });
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Clore' }));
    expect(vi.mocked(api.patch).mock.calls[0]).toEqual(['/sessions/a1', { status: 'finished' }]);
    await waitFor(() => expect(screen.queryByTestId('assignment-row')).not.toBeInTheDocument());
  });

  it('clore : annuler la confirmation n’appelle pas l’API', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Clore' }));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('clore : message en cas d’échec', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.patch).mockRejectedValue({ response: { status: 404 } });
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Clore' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("vous n'en êtes pas le créateur");
    expect(screen.getByTestId('assignment-row')).toBeInTheDocument();
  });
});
