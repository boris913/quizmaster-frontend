import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import SessionPresentPage from '@/app/creator/session/[id]/present/page';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;
let showLeaderboard: boolean | undefined;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'session-1' }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url === '/sessions/session-1') {
        return {
          data: {
            id: 'session-1',
            quiz_id: 'quiz-1',
            creator_id: 'creator-1',
            password: 'K7M2P9',
            status: 'active',
            current_question_index: 0,
            created_at: '2026-11-19T10:00:00Z',
            quizzes: { title: 'Les fractions', total_questions: 2 },
            scoring_mode: 'accuracy',
            ...(showLeaderboard === undefined ? {} : { show_leaderboard: showLeaderboard }),
          },
        };
      }
      if (url === '/sessions/session-1/participants') return { data: [] };
      throw new Error(`URL inattendue : ${url}`);
    }),
  },
}));

/** Classement complet : la projection est dans la room créateur et le reçoit toujours. */
const finalLeaderboard = [
  { rank: 1, participant_id: 'p1', pseudo: 'Alice', score: 1800 },
  { rank: 2, participant_id: 'p2', pseudo: 'Bob', score: 900 },
];

function playQuestion(id: string, accuracy: number, totalParticipants: number) {
  act(() =>
    socket.serverEmit('question:start', {
      question: { id, text: `Question ${id}`, type: 'single', options: [{ id: 'A', text: 'Oui' }], timer_seconds: 20 },
      question_number: 1,
      total_questions: 2,
      timer_seconds: 20,
      started_at: Date.now(),
    })
  );
  act(() =>
    socket.serverEmit('question:stats', {
      questionId: id,
      distribution: { A: 1 },
      correctAnswers: ['A'],
      accuracy,
      answeredCount: totalParticipants,
      totalParticipants,
    })
  );
  act(() =>
    socket.serverEmit('question:ended', { question_id: id, correct_answers: ['A'], leaderboard: finalLeaderboard })
  );
}

function renderPage() {
  render(
    <SocketProvider>
      <SessionPresentPage />
    </SocketProvider>
  );
  act(() => socket.serverEmit('connect'));
}

describe('Écran de projection : show_leaderboard', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useAuthStore.setState({ token: 'jwt-test', isAuthenticated: true });
    useSessionStore.setState({ currentSession: null, participants: [] });
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('classement masqué : aucun classement nominatif, précision cumulée de la classe', async () => {
    showLeaderboard = false;
    renderPage();
    await screen.findByText('Les fractions');

    // 75 % de 4 + 50 % de 4 = 5 bonnes réponses sur 8 attendues.
    playQuestion('q1', 75, 4);
    playQuestion('q2', 50, 4);
    act(() =>
      socket.serverEmit('quiz:finished', {
        final_leaderboard: finalLeaderboard,
        winner_pseudo: 'Alice',
        total_participants: 2,
        total_questions: 2,
      })
    );

    expect(screen.getByRole('heading', { name: 'Quiz terminé !' })).toBeInTheDocument();
    expect(screen.queryByTestId('final-ranking')).not.toBeInTheDocument();
    expect(screen.getByTestId('final-class-accuracy')).toHaveTextContent('63 %');
    expect(screen.getByTestId('final-class-accuracy')).toHaveTextContent('de bonnes réponses pour la classe');
    const screenText = screen.getByTestId('projection-screen').textContent ?? '';
    expect(screenText).not.toMatch(/Alice|Bob|1800/);
  });

  it('classement masqué sans statistiques reçues : message neutre, toujours aucun pseudo', async () => {
    showLeaderboard = false;
    renderPage();
    await screen.findByText('Les fractions');
    act(() => socket.serverEmit('quiz:finished', { final_leaderboard: finalLeaderboard }));

    expect(screen.getByTestId('final-class-accuracy')).toHaveTextContent('Bravo à toute la classe !');
    expect(screen.getByTestId('projection-screen')).not.toHaveTextContent('Alice');
  });

  it.each([
    ['visible', true],
    ['absent (ancien backend)', undefined],
  ])('show_leaderboard %s : classement final projeté (non-régression)', async (_label, value) => {
    showLeaderboard = value;
    renderPage();
    await screen.findByText('Les fractions');
    playQuestion('q1', 75, 4);
    act(() => socket.serverEmit('quiz:finished', { final_leaderboard: finalLeaderboard }));

    expect(screen.getByTestId('final-ranking')).toHaveTextContent('1. Alice');
    expect(screen.queryByTestId('final-class-accuracy')).not.toBeInTheDocument();
  });
});
