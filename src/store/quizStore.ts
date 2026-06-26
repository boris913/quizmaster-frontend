'use client';

import { create } from 'zustand';
import { Quiz, Question } from '@/types';
import api from '@/lib/api';

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  isLoading: boolean;
  fetchQuizzes: () => Promise<void>;
  fetchQuiz: (id: string) => Promise<void>;
  createQuiz: (data: any) => Promise<Quiz>;
  updateQuiz: (id: string, data: any) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  addQuestions: (quizId: string, questions: any[]) => Promise<void>;
  deleteQuestion: (quizId: string, questionId: string) => Promise<void>;
  importQuestions: (quizId: string, questionsContent: string, answersContent?: string) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  isLoading: false,

  fetchQuizzes: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/quizzes');
      set({ quizzes: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuiz: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/quizzes/${id}`);
      set({ currentQuiz: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createQuiz: async (data) => {
    const { data: quiz } = await api.post('/quizzes', data);
    set((state) => ({ quizzes: [quiz, ...state.quizzes] }));
    return quiz;
  },

  updateQuiz: async (id, data) => {
    const { data: updated } = await api.patch(`/quizzes/${id}`, data);
    set((state) => ({
      quizzes: state.quizzes.map((q) => (q.id === id ? updated : q)),
      currentQuiz: state.currentQuiz?.id === id ? updated : state.currentQuiz,
    }));
  },

  deleteQuiz: async (id) => {
    await api.delete(`/quizzes/${id}`);
    set((state) => ({
      quizzes: state.quizzes.filter((q) => q.id !== id),
      currentQuiz: state.currentQuiz?.id === id ? null : state.currentQuiz,
    }));
  },

  addQuestions: async (quizId, questions) => {
    const { data } = await api.post(`/quizzes/${quizId}/questions`, { questions });
    // Rafraîchir le quiz
    await get().fetchQuiz(quizId);
    return data;
  },

  deleteQuestion: async (quizId, questionId) => {
    await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
    await get().fetchQuiz(quizId);
  },

  importQuestions: async (quizId, questionsContent, answersContent) => {
    await api.post(`/quizzes/${quizId}/import`, { questions_content: questionsContent, answers_content: answersContent });
    await get().fetchQuiz(quizId);
  },
}));