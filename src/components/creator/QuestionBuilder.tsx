'use client';

import { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('quizForm.question');
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
        <h3 className="font-medium">{t('title', { number: index + 1 })}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={t('remove', { number: index + 1 })}
          title={t('remove', { number: index + 1 })}
        >
          <Trash2 className="w-4 h-4 text-danger" aria-hidden />
        </Button>
      </div>

      <Input
        label={t('text')}
        {...register(`questions.${index}.text`)}
        error={errors?.text?.message}
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-small">
          <input
            type="radio"
            value="single"
            checked={type === 'single'}
            onChange={() => setValue(`questions.${index}.type`, 'single')}
          />
          {t('single')}
        </label>
        <label className="flex items-center gap-2 text-small">
          <input
            type="radio"
            value="multiple"
            checked={type === 'multiple'}
            onChange={() => setValue(`questions.${index}.type`, 'multiple')}
          />
          {t('multiple')}
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-small font-medium">{t('options')}</p>
        {options.map((opt: any, optIndex: number) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="w-6 font-display font-semibold text-small">{opt.id}</span>
            <Input
              placeholder={t('optionPlaceholder', { id: opt.id })}
              {...register(`questions.${index}.options.${optIndex}.text`)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => toggleCorrect(opt.id)}
              className={cn(
                'px-2 py-1 text-caption rounded-sm border transition-colors',
                correctAnswers.includes(opt.id)
                  ? 'bg-success-50 border-success text-success'
                  : 'bg-surface border-borderc text-ink-tertiary'
              )}
            >
              {correctAnswers.includes(opt.id) ? t('correct') : t('markCorrect')}
            </button>
          </div>
        ))}
        {errors?.options && (
          <p className="text-small text-danger">{t('minOptions')}</p>
        )}
        {errors?.correct_answers && (
          <p className="text-small text-danger">{t('minCorrect')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={explanationId} className="text-small font-medium text-ink">
          {t('explanation')}
        </label>
        <textarea
          id={explanationId}
          rows={2}
          maxLength={QUESTION_EXPLANATION_MAX_LENGTH}
          placeholder={t('explanationPlaceholder')}
          aria-describedby={`${explanationId}-count`}
          aria-invalid={!!errors?.explanation}
          className={cn(
            'w-full rounded-md border border-borderc-strong bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-tertiary',
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
          label={t('maxPoints')}
          type="number"
          {...register(`questions.${index}.max_points`, { valueAsNumber: true })}
          error={errors?.max_points?.message}
        />
        {!useGlobalTimer && (
          <Input
            label={t('timer')}
            type="number"
            {...register(`questions.${index}.timer_seconds`, { valueAsNumber: true })}
            error={errors?.timer_seconds?.message}
          />
        )}
        {useGlobalTimer && (
          <div className="text-small text-ink-secondary flex items-center">
            {t('globalTimer', { seconds: globalTimer })}
          </div>
        )}
      </div>
    </Card>
  );
}
