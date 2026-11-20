import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionControl } from '@/components/creator/SessionControl';
import { SocketProvider } from '@/hooks/useSocket';
import { useQuestionResults } from '@/hooks/useQuestionResults';
import { disconnectSocket } from '@/lib/socket';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

const onStartQuestion = vi.fn();
const onEnd = vi.fn();

/** Câblage identique à la page de pilotage : statistiques socket → SessionControl (+ classement). */
function Harness({ currentQuestion = 0, totalQuestions = 3 }: { currentQuestion?: number; totalQuestions?: number }) {
  const results = useQuestionResults();
  return (
    <>
      <SessionControl
        status="active"
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
        onStartQuestion={onStartQuestion}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onEnd={onEnd}
        questionResults={results.view === 'results' && results.stats ? { stats: results.stats, options: results.options } : null}
        onShowLeaderboard={results.showLeaderboard}
      />
      {results.view !== 'results' && <div data-testid="leaderboard">Classement</div>}
    </>
  );
}

function renderHarness(props?: { currentQuestion?: number; totalQuestions?: number }) {
  const utils = render(
    <SocketProvider>
      <Harness {...props} />
    </SocketProvider>
  );
  act(() => socket.serverEmit('connect'));
  return utils;
}

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

const stats = {
  questionId: 'q1',
  distribution: { A: 1, B: 3 },
  correctAnswers: ['B'],
  accuracy: 60,
  answeredCount: 4,
  totalParticipants: 5,
};

describe('SessionControl : étape « résultats de la question »', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    onStartQuestion.mockClear();
    onEnd.mockClear();
  });

  afterEach(() => {
    cleanup();
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('question → résultats (histogramme) → classement', () => {
    renderHarness();
    act(() => socket.serverEmit('question:start', questionStart));

    // Question en cours : contrôles habituels, pas d'histogramme.
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
    expect(screen.queryByTestId('answer-histogram')).not.toBeInTheDocument();

    act(() => socket.serverEmit('question:stats', stats));

    const results = screen.getByRole('region', { name: 'Résultats de la question' });
    expect(results).toHaveTextContent('Résultats de la question 1');
    expect(screen.getByTestId('histogram-row-B')).toHaveTextContent('Paris');
    expect(screen.getByTestId('histogram-row-B')).toHaveTextContent('75 %');
    expect(screen.queryByRole('button', { name: /Pause/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Afficher le classement/ }));
    expect(screen.queryByTestId('answer-histogram')).not.toBeInTheDocument();
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
  });

  it('« Question suivante » depuis les résultats, puis retour à la question', () => {
    renderHarness();
    act(() => socket.serverEmit('question:start', questionStart));
    act(() => socket.serverEmit('question:stats', stats));

    fireEvent.click(screen.getByRole('button', { name: /Question suivante/ }));
    expect(onStartQuestion).toHaveBeenCalledTimes(1);

    act(() => socket.serverEmit('question:start', { ...questionStart, question: { ...questionStart.question, id: 'q2' } }));
    expect(screen.queryByTestId('answer-histogram')).not.toBeInTheDocument();
  });

  it('dernière question : « Terminer le quiz » à la place de « Question suivante »', () => {
    renderHarness({ currentQuestion: 2, totalQuestions: 3 });
    act(() => socket.serverEmit('question:start', questionStart));
    act(() => socket.serverEmit('question:stats', stats));

    expect(screen.queryByRole('button', { name: /Question suivante/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Terminer le quiz/ }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('retire ses écouteurs au démontage', () => {
    const { unmount } = renderHarness();
    expect(socket.listenerCount('question:stats')).toBe(1);
    unmount();
    expect(socket.listenerCount('question:stats')).toBe(0);
  });
});
