import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import GamePage from '@/app/player/game/[sessionId]/page';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { usePlayerStore } from '@/store/playerStore';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useSearchParams: () => new URLSearchParams('participantId=p1'),
  useRouter: () => ({ push: vi.fn() }),
}));

const participant = { id: 'p1', session_id: 'session-1', pseudo: 'Alice', score: 120, status: 'waiting' as const, joined_at: '' };

function renderPage() {
  const utils = render(
    <SocketProvider>
      <GamePage />
    </SocketProvider>
  );
  // Voir present/page.test.tsx : « connect » est rejoué après la pose des écouteurs.
  act(() => socket.serverEmit('connect'));
  return utils;
}

describe('Partie joueur : exclusion', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('affiche « Tu as été retiré de la partie » et vide le playerStore', () => {
    renderPage();
    expect(socket.emitted('participant:join')).toHaveLength(1);

    act(() => socket.serverEmit('participant:join:success', { participant }));
    act(() => usePlayerStore.getState().setSessionId('session-1'));
    expect(usePlayerStore.getState().participant?.pseudo).toBe('Alice');

    act(() => socket.serverEmit('participant:kicked', { reason: 'kicked' }));

    expect(screen.getByRole('heading', { name: 'Tu as été retiré de la partie' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu as été retiré de la partie' })).toHaveFocus();
    const state = usePlayerStore.getState();
    expect(state.participant).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.score).toBe(0);
  });

  it('l’écran reste affiché même si une question arrive ensuite, sans nouveau participant:join', () => {
    renderPage();
    act(() => socket.serverEmit('participant:kicked', { reason: 'kicked' }));
    act(() =>
      socket.serverEmit('question:start', {
        question: { id: 'q1', question_text: 'Q', type: 'single', options: [], points: 100 },
        question_number: 1,
        total_questions: 3,
        timer_seconds: 20,
      })
    );

    expect(screen.getByText('Tu as été retiré de la partie')).toBeInTheDocument();
    expect(socket.emitted('participant:join')).toHaveLength(1);
  });
});
