import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';
import SessionControlPage from '@/app/creator/session/[id]/page';

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'sess-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);

/** Dernière question en cours : le bouton « Terminer le quiz » est affiché. */
const activeSession = {
  id: 'sess-1',
  password: 'K7M2P9',
  status: 'active',
  current_question_index: 2,
  quizzes: { title: 'Les fractions', total_questions: 3 },
};

let sessionStatus = 'active';

function sessionFetchCount() {
  return mockedGet.mock.calls.filter(([url]) => url === '/sessions/sess-1').length;
}

async function renderPage() {
  render(
    <SocketProvider>
      <SessionControlPage />
    </SocketProvider>
  );
  await screen.findByRole('heading', { name: 'Les fractions' });
  // Le mock émet « connect » de façon synchrone dans connect(), avant que SocketProvider
  // n'ait posé son écouteur : on rejoue l'événement pour passer isConnected à vrai.
  act(() => socket.serverEmit('connect'));
}

describe('Page de session créateur — fin de partie', () => {
  beforeEach(() => {
    socket = createMockSocket();
    sessionStatus = 'active';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockedGet.mockReset();
    mockedGet.mockImplementation(async (url: string) => {
      if (url === '/sessions/sess-1') return { data: { ...activeSession, status: sessionStatus } };
      return { data: [] }; // participants, leaderboard
    });
    useAuthStore.setState({ token: 'jwt', isAuthenticated: true });
    useSessionStore.setState({ currentSession: null, participants: [], leaderboard: [] });
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('quiz:finished reçu : CTA « Voir le rapport » affiché immédiatement, sans attendre le timer', async () => {
    await renderPage();
    expect(socket.emitted('creator:join')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Voir le rapport/ })).not.toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Terminer le quiz/ }));
    expect(socket.emitted('quiz:end')).toEqual([[{ sessionId: 'sess-1' }]]);

    // Le backend renvoie encore « active » à la relecture : seul l'événement fait basculer l'écran.
    act(() =>
      socket.serverEmit('quiz:finished', {
        final_leaderboard: [],
        winner_pseudo: null,
        total_participants: 0,
        total_questions: 3,
      })
    );

    expect(screen.getByRole('link', { name: /Voir le rapport/ })).toHaveAttribute(
      'href',
      '/creator/session/sess-1/results'
    );

    // La relecture de secours est annulée : seule celle déclenchée par l'événement a lieu.
    const fetchesAfterEvent = sessionFetchCount();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(sessionFetchCount()).toBe(fetchesAfterEvent);
    expect(screen.getByRole('link', { name: /Voir le rapport/ })).toBeInTheDocument();
  });

  it("filet de sécurité : sans quiz:finished, la session est relue après 3 s", async () => {
    await renderPage();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Terminer le quiz/ }));
    sessionStatus = 'finished';
    const before = sessionFetchCount();

    await act(async () => {
      vi.advanceTimersByTime(2900);
    });
    expect(sessionFetchCount()).toBe(before);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(sessionFetchCount()).toBe(before + 1);
    expect(screen.getByRole('link', { name: /Voir le rapport/ })).toBeInTheDocument();
  });

  it('le timer de secours et les écouteurs sont nettoyés au démontage', async () => {
    const { unmount } = render(
      <SocketProvider>
        <SessionControlPage />
      </SocketProvider>
    );
    await screen.findByRole('heading', { name: 'Les fractions' });
    act(() => socket.serverEmit('connect'));
    // La page et le hook useQuestionResults (#5) écoutent chacun quiz:finished.
    expect(socket.listenerCount('quiz:finished')).toBe(2);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Terminer le quiz/ }));
    const before = sessionFetchCount();
    unmount();

    expect(socket.listenerCount('quiz:finished')).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(sessionFetchCount()).toBe(before);
  });
});
