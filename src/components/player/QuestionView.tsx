'use client';

import { Question } from '@/types';
import { QuestionCard } from '../ui/QuestionCard';
import { Timer } from '../ui/Timer';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface QuestionViewProps {
  /**
   * Question à jouer. Tous les types du backend #7 sont rendus en interne (Vrai/Faux,
   * remise en ordre, réponse courte, sondage) : aucune prop supplémentaire n'est nécessaire.
   */
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
  const t = useTranslations('player.question');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasSelected, setHasSelected] = useState(false);

  const [questionId, setQuestionId] = useState(question.id);

  // Nouvelle question sans remontage du composant : on repart d'une réponse vide. Fait au
  // rendu (et non dans un effet) pour ne pas écraser la réponse initiale que QuestionCard
  // transmet à son montage (ordre affiché d'une question « remettre dans l'ordre »).
  if (questionId !== question.id) {
    setQuestionId(question.id);
    setSelectedAnswers([]);
    setHasSelected(false);
  }

  const handleSelect = (answers: string[]) => {
    setSelectedAnswers(answers);
    setHasSelected(answers.length > 0);
    onAnswer(answers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Progress first: reinforces the endowed-progress effect (you're already this far). */}
      <ProgressBar
        value={questionNumber}
        max={totalQuestions}
        label={questionNumber === totalQuestions ? t('last') : t('progress')}
      />

      {/* The question is the single primary element; the timer stays small and out of the way. */}
      <div className="flex justify-end -mb-2">
        <Timer
          duration={timerSeconds}
          isActive={!isAnswered}
          onComplete={() => {
            if (!isAnswered) onSubmit();
          }}
        />
      </div>

      <QuestionCard
        key={question.id}
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onSelectAnswer={handleSelect}
        isDisabled={isAnswered}
        selectedAnswers={selectedAnswers}
        onSubmit={() => {
          if (hasSelected && !isAnswered && !isSubmitting) onSubmit();
        }}
      />

      <Button
        onClick={onSubmit}
        disabled={!hasSelected || isAnswered || isSubmitting}
        size="lg"
        className="w-full"
        isLoading={isSubmitting}
      >
        {question.type === 'poll' ? t('vote') : t('submit')}
      </Button>
    </motion.div>
  );
}
