'use client';

import { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { QuestionBuilder } from './QuestionBuilder';
import { Plus } from 'lucide-react';
import { QUESTION_EXPLANATION_MAX_LENGTH } from '@/types';

type Translator = ReturnType<typeof useTranslations<'quizForm'>>;

function buildQuizSchema(t: Translator) {
  const questionSchema = z.object({
    text: z.string().min(1, t('errors.textRequired')),
    type: z.enum(['single', 'multiple']),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string().min(1, t('errors.optionRequired')),
        })
      )
      .min(2, t('errors.minOptions')),
    correct_answers: z.array(z.string()).min(1, t('errors.minCorrect')),
    max_points: z.number().min(10, t('errors.pointsRange')).max(1000, t('errors.pointsRange')),
    timer_seconds: z.number().min(5, t('errors.timerRange')).max(300, t('errors.timerRange')).optional(),
    // Facultative : une chaîne vide n'est pas envoyée au backend.
    explanation: z
      .string()
      .max(QUESTION_EXPLANATION_MAX_LENGTH, t('errors.maxChars', { count: QUESTION_EXPLANATION_MAX_LENGTH }))
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  });

  return z.object({
    title: z.string().min(3, t('errors.titleRequired')).max(200),
    description: z.string().max(1000).optional(),
    global_timer_seconds: z.number().min(5, t('errors.timerRange')).max(300, t('errors.timerRange')),
    use_global_timer: z.boolean(),
    questions: z.array(questionSchema),
  });
}

type QuizFormData = z.infer<ReturnType<typeof buildQuizSchema>>;

interface QuizFormProps {
  initialData?: Partial<QuizFormData>;
  onSubmit: (data: QuizFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function QuizForm({ initialData, onSubmit, isSubmitting }: QuizFormProps) {
  const t = useTranslations('quizForm');
  const quizSchema = useMemo(() => buildQuizSchema(t), [t]);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      global_timer_seconds: 30,
      use_global_timer: true,
      questions: [],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const useGlobalTimer = watch('use_global_timer');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card className="p-6 space-y-4">
        <h2 className="text-card-title">{t('general')}</h2>
        <Input label={t('title')} {...register('title')} error={errors.title?.message} />
        <Input label={t('description')} {...register('description')} />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-small">
            <input
              type="checkbox"
              {...register('use_global_timer')}
              className="rounded border-borderc"
            />
            {t('useGlobalTimer')}
          </label>
        </div>
        {useGlobalTimer && (
          <Input
            label={t('globalTimer')}
            type="number"
            {...register('global_timer_seconds', { valueAsNumber: true })}
            error={errors.global_timer_seconds?.message}
          />
        )}
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-card-title">{t('questions', { count: fields.length })}</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => append({
              text: '',
              type: 'single',
              options: [
                { id: 'A', text: '' },
                { id: 'B', text: '' },
                { id: 'C', text: '' },
                { id: 'D', text: '' },
              ],
              correct_answers: [],
              max_points: 100,
              timer_seconds: 30,
              explanation: '',
            })}
          >
            <Plus className="w-4 h-4" /> {t('addQuestion')}
          </Button>
        </div>

        {fields.map((field, index) => (
          <QuestionBuilder
            key={field.id}
            index={index}
            control={control as any}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={(errors.questions as any)?.[index]}
            onRemove={() => remove(index)}
            useGlobalTimer={useGlobalTimer}
            globalTimer={watch('global_timer_seconds')}
          />
        ))}
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
