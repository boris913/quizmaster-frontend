import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import GamePage from '@/app/player/game/[sessionId]/page';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
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

const questionStart = {
  question: {
    id: 'q1',
    quiz_id: 'quiz-1',
    text: 'Capitale de la France ?',
    type: 'single',
    options: [
      { id: 'A', text: 'Londres' },
      { id: 'B', text: 'Paris' },
    ],
    max_points: 1000,
    timer_seconds: 20,
    order_index: 0,
    created_at: '',
  },
  question_number: 1,
  total_questions: 3,
  timer_seconds: 20,
  started_at: 0,
};

/** `answer:result` tel qu'envoyé par le backend #6 : `correct_answers` toujours vide (anti-triche). */
const answerResult = {
  is_correct: false,
  points_earned: 0,
  max_points: 1000,
  time_taken_ms: 3000,
  correct_answers: [],
  your_answer: ['A'],
  total_score: 0,
  rank: 2,
  total_participants: 2,
  gap_to_next: 500,
  gap_to_podium: null,
  on_podium: true,
  waiting_for_timer: true,
};

function renderPage() {
  render(
    <SocketProvider>
      <GamePage />
    </SocketProvider>
  );
  act(() => socket.serverEmit('connect'));
  act(() =>
    socket.serverEmit('participant:join:success', {
      participant: { id: 'p1', pseudo: 'Alice', score: 0 },
    })
  );
  act(() => socket.serverEmit('question:start', questionStart));
}

describe('Écran joueur : correction à la clôture', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('ne montre pas la bonne réponse avant question:reveal, puis affiche la correction et l’explication', () => {
    renderPage();
    act(() => socket.serverEmit('answer:result', answerResult));

    // Réponse fausse mais donnée : pas d'écran « Temps écoulé », pas de correction prématurée.
    expect(screen.queryByText('Temps écoulé !')).not.toBeInTheDocument();
    expect(screen.queryByTestId('answer-reveal')).not.toBeInTheDocument();
    expect(screen.getByText('Correction à la fin de la question…')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('question:reveal', {
        questionId: 'q1',
        correctAnswers: ['B'],
        explanation: 'Paris est la capitale depuis 987.',
        yourAnswers: ['A'],
        isCorrect: false,
      })
    );

    const region = screen.getByRole('region', { name: 'Mauvaise réponse' });
    expect(region).toHaveTextContent('Votre réponse :A. Londres');
    expect(region).toHaveTextContent('Bonne réponse :B. Paris');
    expect(screen.getByTestId('answer-explanation')).toHaveTextContent('Paris est la capitale depuis 987.');
    expect(screen.getByText('En attente de la prochaine question…')).toBeInTheDocument();
  });

  it('joueur sans réponse : la correction arrive quand même à la clôture', () => {
    renderPage();
    expect(screen.getByText('Capitale de la France ?')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('question:reveal', {
        questionId: 'q1',
        correctAnswers: ['B'],
        explanation: null,
        yourAnswers: [],
        isCorrect: false,
      })
    );

    expect(screen.getByRole('region', { name: 'Pas de réponse' })).toHaveTextContent('Bonne réponse :B. Paris');
    expect(screen.queryByTestId('answer-explanation')).not.toBeInTheDocument();
  });
});
