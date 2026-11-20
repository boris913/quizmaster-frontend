import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import SessionPresentPage from '@/app/creator/session/[id]/present/page';
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
}));

const session = {
  id: 'session-1',
  quiz_id: 'quiz-1',
  creator_id: 'creator-1',
  password: 'k7m2p9',
  status: 'waiting',
  current_question_index: -1,
  created_at: '2026-11-19T10:00:00Z',
  quizzes: { title: 'Les fractions', total_questions: 3 },
};

const restParticipants = [
  { id: 'p1', session_id: 'session-1', pseudo: 'Alice', score: 0, status: 'waiting', joined_at: '' },
  { id: 'p0', session_id: 'session-1', pseudo: 'Fantome', score: 0, status: 'disconnected', joined_at: '' },
];

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url === '/sessions/session-1') return { data: session };
      if (url === '/sessions/session-1/participants') {
        // Réponse volontairement plus lente que celle de la session (ordre réel quelconque).
        await new Promise((r) => setTimeout(r, 30));
        return { data: restParticipants };
      }
      throw new Error(`URL inattendue : ${url}`);
    }),
  },
}));

const CONTROL_EVENTS = ['question:start', 'session:pause', 'session:resume', 'quiz:end'];

function renderPage() {
  const utils = render(
    <SocketProvider>
      <SessionPresentPage />
    </SocketProvider>
  );
  // Le mock émet « connect » de façon synchrone dans connect(), avant que SocketProvider
  // n'ait posé son écouteur : on rejoue l'événement comme le ferait le vrai serveur (asynchrone).
  act(() => socket.serverEmit('connect'));
  return utils;
}

describe('Écran de projection', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useAuthStore.setState({ token: 'jwt-test', isAuthenticated: true });
    useSessionStore.setState({ currentSession: null, participants: [] });
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('affiche le code en grand, le QR code et les participants connectés', async () => {
    renderPage();

    expect(await screen.findByTestId('session-code')).toHaveTextContent('K7M2P9');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Les fractions');

    const qr = screen.getByTestId('join-qr');
    await waitFor(() =>
      expect(qr.getAttribute('data-url')).toMatch(/\/player\/join\?code=K7M2P9$/)
    );
    expect(within(qr).getByRole('img')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('participant-count')).toHaveTextContent('1'));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Fantome')).not.toBeInTheDocument();
  });

  it('rejoint la salle en lecture seule et met à jour pseudos et compteur en direct', async () => {
    renderPage();
    await screen.findByTestId('session-code');
    await screen.findByText('Alice');

    expect(socket.emitted('creator:join')).toEqual([[{ sessionId: 'session-1', token: 'jwt-test' }]]);

    act(() =>
      socket.serverEmit('participant:joined', {
        participant: { id: 'p2', pseudo: 'Bob', score: 0, status: 'waiting' },
        total_participants: 2,
      })
    );
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByTestId('participant-count')).toHaveTextContent('2');

    act(() => socket.serverEmit('participant:disconnected', { participant_id: 'p1' }));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByTestId('participant-count')).toHaveTextContent('1');
  });

  it('affiche la question en cours et le minuteur, sans aucun contrôle', async () => {
    renderPage();
    await screen.findByTestId('session-code');

    act(() => socket.serverEmit('question:countdown', { countdown: 3, message: 'Prêt ?' }));
    expect(screen.getByText('3')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('question:start', {
        question: {
          id: 'q1',
          quiz_id: 'quiz-1',
          text: 'Combien font 1/2 + 1/4 ?',
          type: 'single',
          options: [
            { id: 'A', text: '3/4' },
            { id: 'B', text: '2/6' },
          ],
          max_points: 1000,
          timer_seconds: 20,
          order_index: 0,
          created_at: '',
        },
        question_number: 1,
        total_questions: 3,
        timer_seconds: 20,
        started_at: Date.now(),
      })
    );

    expect(screen.getByTestId('question-text')).toHaveTextContent('Combien font 1/2 + 1/4 ?');
    expect(screen.getByText('Question 1/3')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByTestId('timer')).toHaveTextContent('20');

    // Aucun bouton de pilotage : seul le bouton d'affichage plein écran est toléré.
    const buttons = screen.queryAllByRole('button');
    buttons.forEach((b) => expect(b.textContent ?? b.getAttribute('aria-label')).toMatch(/plein écran/i));
    CONTROL_EVENTS.forEach((event) => expect(socket.emitted(event)).toHaveLength(0));

    act(() => socket.serverEmit('session:paused', {}));
    expect(screen.getByRole('status')).toHaveTextContent('Pause');
    act(() => socket.serverEmit('session:resumed', {}));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() =>
      socket.serverEmit('question:ended', {
        question_id: 'q1',
        correct_answers: ['A'],
        leaderboard: [],
      })
    );
    expect(screen.getByText('Temps écoulé !')).toBeInTheDocument();
    expect(screen.getByTestId('timer')).toHaveTextContent('0');
  });

  it('le minuteur décompte', async () => {
    renderPage();
    await screen.findByTestId('session-code');

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    act(() =>
      socket.serverEmit('question:start', {
        question: { id: 'q1', text: 'Q ?', type: 'single', options: [], timer_seconds: 10 },
        question_number: 1,
        total_questions: 1,
        timer_seconds: 10,
        started_at: Date.now(),
      })
    );
    expect(screen.getByTestId('timer')).toHaveTextContent('10');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('timer')).toHaveTextContent('7');
  });

  it('retire ses écouteurs au démontage', async () => {
    const { unmount } = renderPage();
    await screen.findByTestId('session-code');
    expect(socket.listenerCount('participant:joined')).toBeGreaterThan(0);

    unmount();
    expect(socket.listenerCount('participant:joined')).toBe(0);
    expect(socket.listenerCount('question:start')).toBe(0);
  });
});
