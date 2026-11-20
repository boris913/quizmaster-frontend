'use client';

import { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUESTION_EXPLANATION_MAX_LENGTH } from '@/types';

interface QuestionBuilderProps {
  index: number;
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: any;
  onRemove: () => void;
  useGlobalTimer: boolean;
  globalTimer: number;
}

export function QuestionBuilder({
  index,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  useGlobalTimer,
  globalTimer,
}: QuestionBuilderProps) {
  const options = watch(`questions.${index}.options`) || [];
  const correctAnswers = watch(`questions.${index}.correct_answers`) || [];
  const type = watch(`questions.${index}.type`) || 'single';
  const explanation: string = watch(`questions.${index}.explanation`) || '';
  const explanationId = `questions-${index}-explanation`;

  // Typage explicite du paramètre
  const toggleCorrect = (optionId: string) => {
    const current = correctAnswers;
    if (type === 'single') {
      setValue(`questions.${index}.correct_answers`, [optionId]);
    } else {
      const newCorrect = current.includes(optionId)
        ? current.filter((id: string) => id !== optionId)
        : [...current, optionId];
      setValue(`questions.${index}.correct_answers`, newCorrect);
    }
  };

  return (
    <Card className="p-4 space-y-4 border-borderc">
      <div className="flex justify-between items-start">
        <h3 className="font-medium">Question {index + 1}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-danger" />
        </Button>
      </div>

      <Input
        label="Énoncé"
        {...register(`questions.${index}.text`)}
        error={errors?.text?.message}
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="single"
            checked={type === 'single'}
            onChange={() => setValue(`questions.${index}.type`, 'single')}
          />
          Réponse unique
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="multiple"
            checked={type === 'multiple'}
            onChange={() => setValue(`questions.${index}.type`, 'multiple')}
          />
          Réponses multiples
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Options</p>
        {options.map((opt: any, optIndex: number) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="w-6 font-display tabular-nums text-sm">{opt.id}</span>
            <Input
              placeholder={`Option ${opt.id}`}
              {...register(`questions.${index}.options.${optIndex}.text`)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => toggleCorrect(opt.id)}
              className={cn(
                'px-2 py-1 text-xs rounded border transition-colors',
                correctAnswers.includes(opt.id)
                  ? 'bg-success-50 border-success text-success'
                  : 'bg-surface border-borderc text-ink-tertiary'
              )}
            >
              {correctAnswers.includes(opt.id) ? 'Correcte' : 'Marquer correcte'}
            </button>
          </div>
        ))}
        {errors?.options && (
          <p className="text-sm text-danger">Au moins 2 options requises</p>
        )}
        {errors?.correct_answers && (
          <p className="text-sm text-danger">Au moins une bonne réponse</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={explanationId} className="text-small font-medium text-ink">
          Explication (facultatif)
        </label>
        <textarea
          id={explanationId}
          rows={2}
          maxLength={QUESTION_EXPLANATION_MAX_LENGTH}
          placeholder="Affichée aux élèves après la clôture de la question"
          aria-describedby={`${explanationId}-count`}
          aria-invalid={!!errors?.explanation}
          className={cn(
            'w-full rounded-md border border-borderc bg-surface px-3 py-2 text-body placeholder:text-ink-tertiary',
            'focus:outline-none focus:border-primary focus:shadow-glow',
            errors?.explanation && 'border-danger'
          )}
          {...register(`questions.${index}.explanation`)}
        />
        <p id={`${explanationId}-count`} className="text-caption text-ink-secondary text-right">
          {explanation.length}/{QUESTION_EXPLANATION_MAX_LENGTH}
        </p>
        {errors?.explanation?.message && (
          <p className="text-small text-danger">{errors.explanation.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Points max"
          type="number"
          {...register(`questions.${index}.max_points`, { valueAsNumber: true })}
          error={errors?.max_points?.message}
        />
        {!useGlobalTimer && (
          <Input
            label="Timer (secondes)"
            type="number"
            {...register(`questions.${index}.timer_seconds`, { valueAsNumber: true })}
            error={errors?.timer_seconds?.message}
          />
        )}
        {useGlobalTimer && (
          <div className="text-sm text-ink-secondary flex items-center">
            Timer global: {globalTimer}s
          </div>
        )}
      </div>
    </Card>
  );
}
