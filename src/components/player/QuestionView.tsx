'use client';

import { Question } from '@/types';
import { QuestionCard } from '../ui/QuestionCard';
import { Timer } from '../ui/Timer';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface QuestionViewProps {
  question: Omit<Question, 'correct_answers'>;
  questionNumber: number;
  totalQuestions: number;
  timerSeconds: number;
  onAnswer: (answers: string[]) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isAnswered?: boolean;
}

export function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  timerSeconds,
  onAnswer,
  onSubmit,
  isSubmitting = false,
  isAnswered = false,
}: QuestionViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasSelected, setHasSelected] = useState(false);

  const handleSelect = (answers: string[]) => {
    setSelectedAnswers(answers);
    setHasSelected(answers.length > 0);
    onAnswer(answers);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Timer
        duration={timerSeconds}
        isActive={!isAnswered}
        onComplete={() => {
          if (!isAnswered) onSubmit();
        }}
      />

      <QuestionCard
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onSelectAnswer={handleSelect}
        isDisabled={isAnswered}
        selectedAnswers={selectedAnswers}
      />

      <Button
        onClick={onSubmit}
        disabled={!hasSelected || isAnswered || isSubmitting}
        className="w-full"
        isLoading={isSubmitting}
      >
        Valider ma réponse
      </Button>
    </div>
  );
}