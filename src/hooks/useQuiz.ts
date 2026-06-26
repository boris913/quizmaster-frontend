'use client';

import { useEffect } from 'react';
import { useQuizStore } from '@/store/quizStore';

export function useQuiz() {
  const {
    quizzes,
    currentQuiz,
    isLoading,
    fetchQuizzes,
    fetchQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestions,
    deleteQuestion,
    importQuestions,
  } = useQuizStore();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return {
    quizzes,
    currentQuiz,
    isLoading,
    fetchQuizzes,
    fetchQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestions,
    deleteQuestion,
    importQuestions,
  };
}