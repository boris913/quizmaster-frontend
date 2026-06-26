'use client';

import { create } from 'zustand';
import { Participant, LeaderboardEntry } from '@/types';

interface PlayerState {
  participant: Participant | null;
  sessionId: string | null;
  currentQuestionId: string | null;
  score: number;
  rank: number;
  totalParticipants: number;
  isAnswered: boolean;
  isWaiting: boolean;
  isFinished: boolean;
  setParticipant: (participant: Participant) => void;
  setSessionId: (id: string) => void;
  setCurrentQuestionId: (id: string | null) => void;
  setScore: (score: number) => void;
  setRank: (rank: number) => void;
  setTotalParticipants: (total: number) => void;
  setIsAnswered: (answered: boolean) => void;
  setIsWaiting: (waiting: boolean) => void;
  setIsFinished: (finished: boolean) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  participant: null,
  sessionId: null,
  currentQuestionId: null,
  score: 0,
  rank: 0,
  totalParticipants: 0,
  isAnswered: false,
  isWaiting: true,
  isFinished: false,

  setParticipant: (participant) => set({ participant }),
  setSessionId: (id) => set({ sessionId: id }),
  setCurrentQuestionId: (id) => set({ currentQuestionId: id }),
  setScore: (score) => set({ score }),
  setRank: (rank) => set({ rank }),
  setTotalParticipants: (total) => set({ totalParticipants: total }),
  setIsAnswered: (answered) => set({ isAnswered: answered }),
  setIsWaiting: (waiting) => set({ isWaiting: waiting }),
  setIsFinished: (finished) => set({ isFinished: finished }),

  reset: () =>
    set({
      participant: null,
      sessionId: null,
      currentQuestionId: null,
      score: 0,
      rank: 0,
      totalParticipants: 0,
      isAnswered: false,
      isWaiting: true,
      isFinished: false,
    }),
}));