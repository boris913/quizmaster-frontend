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

function questionStart(id: string, number: number) {
  return {
    question: {
      id,
      quiz_id: 'quiz-1',
      text: `Question ${id}`,
      type: 'single',
      options: [
        { id: 'A', text: 'Londres' },
        { id: 'B', text: 'Paris' },
      ],
      max_points: 1000,
      timer_seconds: 20,
      order_index: number - 1,
      created_at: '',
    },
    question_number: number,
    total_questions: 2,
    timer_seconds: 20,
    started_at: 0,
  };
}

/** `answer:result` en mode masqué (backend #8) : sans rank, total_participants, gap_to_*, on_podium. */
const hiddenAnswerResult = {
  is_correct: true,
  points_earned: 1000,
  max_points: 1000,
  time_taken_ms: 3000,
  correct_answers: [],
  your_answer: ['B'],
  total_score: 1000,
  waiting_for_timer: true,
};

/** Mode par défaut : classement visible. */
const visibleAnswerResult = {
  ...hiddenAnswerResult,
  rank: 2,
  total_participants: 5,
  gap_to_next: 120,
  gap_to_podium: null,
  on_podium: true,
};

const reveal = (questionId: string, isCorrect = true) => ({
  questionId,
  correctAnswers: ['B'],
  explanation: null,
  yourAnswers: ['B'],
  isCorrect,
});

function renderPage() {
  const utils = render(
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
  return utils;
}

/** Aucun rang, podium, écart ni classement nominatif ; jamais « undefined » / « NaN ». */
function expectNoRanking(container: HTMLElement) {
  const text = container.textContent ?? '';
  expect(text).not.toMatch(/place|podium|sur \d+ participants|#\d|Classement|Vainqueur|Écart|undefined|NaN/i);
  expect(screen.queryByTestId('player-rank')).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Classement' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Podium')).not.toBeInTheDocument();
}

describe('Écran joueur : classement masqué', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('aucun rang sur aucun écran, précision de la classe entre les questions et à la fin', () => {
    const { container } = renderPage();

    // Question 1 : réponse, puis clôture.
    act(() => socket.serverEmit('question:start', questionStart('q1', 1)));
    expectNoRanking(container);

    act(() => socket.serverEmit('answer:result', hiddenAnswerResult));
    expect(screen.getByTestId('score-display')).toHaveTextContent('Votre score');
    expectNoRanking(container);

    act(() => socket.serverEmit('question:ended', { question_id: 'q1', correct_answers: ['B'] }));
    act(() => socket.serverEmit('question:reveal', reveal('q1')));
    act(() => socket.serverEmit('player:score', { score: 1000, correctCount: 1, classAccuracy: 78 }));

    expect(screen.getByTestId('class-accuracy')).toHaveTextContent('La classe : 78 % de bonnes réponses');
    expect(screen.getByTestId('class-accuracy')).toHaveTextContent('Vos bonnes réponses : 1');
    expectNoRanking(container);

    // Question 2 : pas de réponse (trop tard), puis clôture.
    act(() => socket.serverEmit('question:start', questionStart('q2', 2)));
    expectNoRanking(container);
    act(() => socket.serverEmit('answer:too_late', {}));
    expectNoRanking(container);
    act(() => socket.serverEmit('question:reveal', { ...reveal('q2', false), yourAnswers: [] }));
    act(() => socket.serverEmit('player:score', { score: 1000, correctCount: 1, classAccuracy: 64 }));
    expect(screen.getByTestId('class-accuracy')).toHaveTextContent('64 % de bonnes réponses');
    expectNoRanking(container);

    // Fin : { classAccuracy, yourScore } au lieu du podium.
    act(() => socket.serverEmit('quiz:finished', { classAccuracy: 64, yourScore: 1000 }));
    const final = screen.getByTestId('final-screen-hidden');
    expect(final).toHaveTextContent('Quiz terminé !');
    expect(final).toHaveTextContent('64 %');
    expect(final).toHaveTextContent('de bonnes réponses dans la classe');
    expect(screen.getByText('Votre score')).toBeInTheDocument();
    expectNoRanking(container);
  });

  it('answer:result sans rang suffit à masquer le rang, même avant player:score', () => {
    const { container } = renderPage();
    act(() => socket.serverEmit('question:start', questionStart('q1', 1)));
    act(() => socket.serverEmit('answer:result', hiddenAnswerResult));

    expect(screen.getByTestId('score-display')).toBeInTheDocument();
    expect(screen.queryByTestId('class-accuracy')).not.toBeInTheDocument();
    expectNoRanking(container);
  });

  it('écran de fin masqué reçu directement (joueur sans réponse) : pas de rang', () => {
    const { container } = renderPage();
    act(() => socket.serverEmit('quiz:finished', { classAccuracy: 50, yourScore: 0 }));

    expect(screen.getByTestId('final-screen-hidden')).toHaveTextContent('50 %');
    expectNoRanking(container);
  });
});

describe('Écran joueur : classement visible (non-régression)', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('affiche le rang, l’écart et le podium entre les questions', () => {
    renderPage();
    act(() => socket.serverEmit('question:start', questionStart('q1', 1)));
    act(() => socket.serverEmit('answer:result', visibleAnswerResult));

    expect(screen.getByTestId('player-rank')).toHaveTextContent('2e place');
    expect(screen.getByTestId('player-rank')).toHaveTextContent('sur 5 participants');
    expect(screen.getByText(/Écart avec le devant/)).toHaveTextContent('120 pts');
    expect(screen.getByText('Vous êtes sur le podium !')).toBeInTheDocument();
    expect(screen.queryByTestId('class-accuracy')).not.toBeInTheDocument();
  });

  it('affiche le podium et le classement final', () => {
    renderPage();
    const entry = (rank: number, id: string, pseudo: string, score: number) => ({
      rank,
      participant_id: id,
      pseudo,
      score,
      last_points: 0,
      answered_current: true,
      gap_to_next: null,
      gap_to_podium: null,
      on_podium: true,
    });
    act(() =>
      socket.serverEmit('quiz:finished', {
        final_leaderboard: [entry(1, 'p2', 'Bob', 2000), entry(2, 'p1', 'Alice', 1000)],
        your_rank: 2,
        your_score: 1000,
        is_winner: false,
        winner_pseudo: 'Bob',
        total_participants: 2,
        total_questions: 2,
        message: 'Bravo, 2e place !',
      })
    );

    expect(screen.queryByTestId('final-screen-hidden')).not.toBeInTheDocument();
    expect(screen.getByText('#2 sur 2')).toBeInTheDocument();
    expect(screen.getByText('Classement final')).toBeInTheDocument();
    expect(screen.getByLabelText('Podium')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Classement' })).toHaveTextContent('Bob');
  });
});
