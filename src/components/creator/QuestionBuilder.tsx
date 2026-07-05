'use client';

import { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionBuilderProps {
  index: number;
  control: Control<any>; // ✅ on accepte n'importe quel Control
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

  // ✅ Typage explicite du paramètre
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
          <Trash2 className="w-4 h-4 text-red-500" />
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
            <span className="w-6 font-mono text-sm">{opt.id}</span>
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
                  : 'bg-white border-borderc text-ink-secondary/70'
              )}
            >
              {correctAnswers.includes(opt.id) ? '✓ Correct' : 'Marquer'}
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
