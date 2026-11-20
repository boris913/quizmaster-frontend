import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionControlPage from '@/app/creator/session/[id]/page';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'session-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const session = {
  id: 'session-1',
  quiz_id: 'quiz-1',
  creator_id: 'creator-1',
  password: 'K7M2P9',
  status: 'waiting',
  current_question_index: -1,
  created_at: '2026-11-19T10:00:00Z',
  quizzes: { title: 'Les fractions', total_questions: 3 },
};

const participants = [
  { id: 'p1', session_id: 'session-1', pseudo: 'Alice', score: 0, status: 'waiting', joined_at: '' },
  { id: 'p2', session_id: 'session-1', pseudo: 'Bob', score: 0, status: 'waiting', joined_at: '' },
];

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url === '/sessions') return { data: [] };
      if (url === '/sessions/session-1') return { data: session };
      if (url === '/sessions/session-1/participants') return { data: participants };
      if (url === '/sessions/session-1/leaderboard') return { data: [] };
      throw new Error(`URL inattendue : ${url}`);
    }),
  },
}));

function renderPage() {
  const utils = render(
    <SocketProvider>
      <SessionControlPage />
    </SocketProvider>
  );
  act(() => socket.serverEmit('connect'));
  return utils;
}

const participantList = () => screen.getByRole('heading', { name: /Participants \(/ }).parentElement as HTMLElement;

describe('Panneau de contrôle : exclusion d’un participant', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useAuthStore.setState({ token: 'jwt-test', isAuthenticated: true });
    useSessionStore.setState({ currentSession: null, participants: [], leaderboard: [] });
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('émet creator:kick après confirmation, puis retire le participant sur participant:disconnected (kicked)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Exclure Bob' }));
    expect(socket.emitted('creator:kick')).toHaveLength(0);

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Exclure' }));
    expect(socket.emitted('creator:kick')).toEqual([[{ sessionId: 'session-1', participantId: 'p2' }]]);

    // Rien ne bouge tant que le serveur n'a pas confirmé.
    expect(within(participantList()).getByText('Bob')).toBeInTheDocument();

    act(() => socket.serverEmit('participant:disconnected', { participant_id: 'p2', reason: 'kicked' }));

    await waitFor(() => expect(within(participantList()).queryByText('Bob')).not.toBeInTheDocument());
    expect(within(participantList()).getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Participants (1)' })).toBeInTheDocument();
    expect(useSessionStore.getState().participants.map((p) => p.id)).toEqual(['p1']);
  });

  it('annuler la confirmation n’émet rien', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Exclure Alice' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(socket.emitted('creator:kick')).toHaveLength(0);
  });
});
