'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Check } from 'lucide-react';

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
        <span className="text-caption font-semibold text-primary uppercase tracking-wide">
          Question {questionNumber} / {totalQuestions}
        </span>
        <span className="text-caption font-medium text-ink-secondary bg-black/[0.04] px-2.5 py-1 rounded-full whitespace-nowrap">
          {question.max_points} pts
        </span>
      </div>

      {/* The question is the single largest, most important element on screen */}
      <h2 className="text-h1 sm:text-display leading-tight text-ink text-balance">
        {question.text}
      </h2>

      <div className="space-y-3" role={question.type === 'single' ? 'radiogroup' : 'group'}>
        {question.options.map((option, i) => {
          const isSelected = selected.includes(option.id);
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
              whileHover={isDisabled || shouldReduceMotion ? undefined : { y: -2 }}
              whileTap={isDisabled || shouldReduceMotion ? undefined : { scale: 0.99 }}
              className={cn(
                'w-full min-h-[44px] text-left px-5 py-4 rounded-md border-2 transition-colors flex items-center gap-3',
                isSelected && !isDisabled
                  ? 'border-primary bg-primary-50'
                  : 'border-borderc hover:border-primary/40 bg-surface',
                isDisabled && isSelected && 'opacity-90',
                isDisabled && !isSelected && 'opacity-50'
              )}
            >
              <span
                className={cn(
                  'font-mono text-small font-semibold min-w-8 h-8 flex items-center justify-center rounded-md',
                  isSelected ? 'bg-primary text-white' : 'bg-black/[0.05] text-ink-secondary'
                )}
              >
                {option.id}
              </span>
              <span className="text-body flex-1">{option.text}</span>
              {isSelected && !isDisabled && (
                <motion.span
                  initial={shouldReduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Check className="w-5 h-5 text-primary" />
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
