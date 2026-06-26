'use client';

import { create } from 'zustand';
import { Session, Participant, LeaderboardEntry } from '@/types';
import api from '@/lib/api';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  participants: Participant[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  fetchParticipants: (id: string) => Promise<void>;
  fetchLeaderboard: (id: string) => Promise<void>;
  createSession: (quizId: string) => Promise<Session>;
  joinSession: (password: string, pseudo: string) => Promise<{ participant: Participant; session: Session }>;
  endSession: (id: string) => Promise<void>;
  updateLeaderboard: (entries: LeaderboardEntry[]) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  participants: [],
  leaderboard: [],
  isLoading: false,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/sessions');
      set({ sessions: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSession: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/sessions/${id}`);
      set({ currentSession: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchParticipants: async (id) => {
    const { data } = await api.get(`/sessions/${id}/participants`);
    set({ participants: data });
  },

  fetchLeaderboard: async (id) => {
    const { data } = await api.get(`/sessions/${id}/leaderboard`);
    set({ leaderboard: data });
  },

  createSession: async (quizId) => {
    const { data } = await api.post('/sessions', { quiz_id: quizId });
    set((state) => ({ sessions: [data, ...state.sessions] }));
    return data;
  },

  joinSession: async (password, pseudo) => {
    const { data } = await api.post('/sessions/join', { password, pseudo });
    return data;
  },

  endSession: async (id) => {
    await api.delete(`/sessions/${id}`);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
    }));
  },

  updateLeaderboard: (entries) => {
    set({ leaderboard: entries });
  },
}));