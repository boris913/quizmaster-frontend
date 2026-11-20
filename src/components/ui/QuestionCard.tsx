'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Check } from 'lucide-react';
import { answerTone } from '@/lib/answerTone';

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    type: 'single' | 'multiple';
    options: { id: string; text: string }[];
    max_points: number;
  };
  questionNumber: number;
  totalQuestions: number;
  onSelectAnswer: (answers: string[]) => void;
  isDisabled?: boolean;
  selectedAnswers?: string[];
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onSelectAnswer,
  isDisabled = false,
  selectedAnswers = [],
}: QuestionCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string[]>(selectedAnswers);

  const handleSelect = (optionId: string) => {
    if (isDisabled) return;
    let newSelected: string[];
    if (question.type === 'single') {
      newSelected = [optionId];
    } else {
      newSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
    }
    setSelected(newSelected);
    onSelectAnswer(newSelected);
  };

  return (
    <Card tier="primary" className="p-6 sm:p-8 space-y-7">
      <div className="flex justify-between items-start gap-4">
        <span className="text-small font-medium text-ink-secondary tabular-nums">
          Question {questionNumber} / {totalQuestions}
        </span>
        <span className="text-caption font-medium text-ink-secondary bg-ink/[0.05] px-2 py-1 rounded-sm whitespace-nowrap tabular-nums">
          {question.max_points} pts
        </span>
      </div>

      {/* The question is the single largest, most important element on screen */}
      <h2 className="text-h1 sm:text-display leading-tight text-ink text-balance">
        {question.text}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2" role={question.type === 'single' ? 'radiogroup' : 'group'}>
        {question.options.map((option, i) => {
          const isSelected = selected.includes(option.id);
          const tone = answerTone(option.id, i);
          return (
            <motion.button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={isDisabled}
              role={question.type === 'single' ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : i * 0.05, duration: 0.25 }}
              whileTap={isDisabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
              className={cn(
                'w-full min-h-[64px] text-left px-4 py-4 rounded-xl border-2 transition-colors flex items-center gap-3',
                isSelected ? cn(tone.border, tone.soft) : 'border-borderc bg-surface hover:border-borderc-strong',
                isDisabled && isSelected && 'opacity-90',
                isDisabled && !isSelected && 'opacity-50'
              )}
            >
              <span
                className={cn(
                  'font-display text-body font-bold min-w-9 h-9 flex items-center justify-center rounded-md text-white',
                  tone.bg
                )}
              >
                {option.id}
              </span>
              <span className="text-body font-medium text-ink flex-1">{option.text}</span>
              {isSelected && !isDisabled && (
                <motion.span
                  initial={shouldReduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Check className={cn('w-5 h-5', tone.text)} strokeWidth={2.5} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {question.type === 'multiple' && !isDisabled && (
        <p className="text-caption text-ink-secondary">
          Sélectionnez plusieurs réponses (cliquez à nouveau pour désélectionner)
        </p>
      )}
    </Card>
  );
}
