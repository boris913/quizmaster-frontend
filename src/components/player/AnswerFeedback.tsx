'use client';

import { AnswerResult } from '../ui/AnswerResult';

interface AnswerFeedbackProps {
  result: {
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    timeTakenMs: number;
    correctAnswers: string[];
    yourAnswers: string[];
    status: 'answered' | 'timeout' | 'skipped';
  };
}

export function AnswerFeedback({ result }: AnswerFeedbackProps) {
  return (
    <div className="max-w-md mx-auto">
      <AnswerResult {...result} />
    </div>
  );
}