'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import {
  normalizeQuestionStats,
  type QuizOption,
  type WsQuestionStartPayload,
  type WsQuestionStatsPayload,
} from '@/types';

/**
 * Étape de la page de pilotage pour la question courante :
 * `question` (en cours) → `results` (histogramme, après `question:stats`) → `leaderboard`.
 */
export type QuestionResultsView = 'idle' | 'question' | 'results' | 'leaderboard';

export interface QuestionResultsState {
  view: QuestionResultsView;
  stats: WsQuestionStatsPayload | null;
  /** Options de la dernière question lancée (reçues avec `question:start`). */
  options: QuizOption[];
}

const initialState: QuestionResultsState = { view: 'idle', stats: null, options: [] };

/**
 * Suit les statistiques de fin de question pour le créateur (room créateur).
 * Les écouteurs sont retirés par référence pour ne pas toucher à ceux de la page.
 */
export function useQuestionResults() {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<QuestionResultsState>(initialState);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onQuestionStart = (data: WsQuestionStartPayload) => {
      const options = Array.isArray(data?.question?.options) ? data.question.options : [];
      setState({ view: 'question', stats: null, options });
    };

    const onQuestionStats = (raw: unknown) => {
      const stats = normalizeQuestionStats(raw);
      if (!stats) return;
      setState((s) => ({ ...s, view: 'results', stats }));
    };

    const onQuizFinished = () => setState((s) => ({ ...s, view: 'idle' }));

    socket.on('question:start', onQuestionStart);
    socket.on('question:stats', onQuestionStats);
    socket.on('quiz:finished', onQuizFinished);
    return () => {
      socket.off('question:start', onQuestionStart);
      socket.off('question:stats', onQuestionStats);
      socket.off('quiz:finished', onQuizFinished);
    };
  }, [socket, isConnected]);

  const showLeaderboard = useCallback(() => {
    setState((s) => (s.view === 'results' ? { ...s, view: 'leaderboard' } : s));
  }, []);

  return { ...state, showLeaderboard };
}
