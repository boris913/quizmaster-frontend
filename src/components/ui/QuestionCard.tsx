'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Check, X } from 'lucide-react';

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
  const [selected, setSelected] = useState<string[]>(selectedAnswers);

  const handleSelect = (optionId: string) => {
    if (isDisabled) return;
    let newSelected: string[];
    if (question.type === 'single') {
      newSelected = [optionId];
    } else {
      newSelected = selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId];
    }
    setSelected(newSelected);
    onSelectAnswer(newSelected);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-sm text-neutral-500">
            Question {questionNumber} / {totalQuestions}
          </span>
          <h2 className="text-xl font-semibold mt-1">{question.text}</h2>
        </div>
        <span className="text-sm font-medium text-neutral-600">
          {question.max_points} pts
        </span>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={isDisabled}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3',
                isSelected && !isDisabled
                  ? 'border-neutral-900 bg-neutral-100'
                  : 'border-neutral-200 hover:border-neutral-400',
                isDisabled && 'cursor-default opacity-70',
                'disabled:opacity-50'
              )}
            >
              <span className="font-mono text-sm font-medium text-neutral-500 min-w-6">
                {option.id}
              </span>
              <span>{option.text}</span>
              {isSelected && !isDisabled && (
                <Check className="ml-auto w-4 h-4 text-neutral-900" />
              )}
            </button>
          );
        })}
      </div>

      {question.type === 'multiple' && !isDisabled && (
        <p className="text-sm text-neutral-500">
          Sélectionnez plusieurs réponses (cliquez à nouveau pour désélectionner)
        </p>
      )}
    </Card>
  );
}