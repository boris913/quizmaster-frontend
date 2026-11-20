'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { QuestionBuilder } from './QuestionBuilder';
import { Plus } from 'lucide-react';
import {
  emptyQuestion,
  questionSchema,
  questionToFormValues,
  toPendingQuestion,
  type PendingQuestion,
} from './questionSchema';
import type { QuestionPayload } from '@/types';

const quizSchema = z.object({
  title: z.string().min(3, 'Titre requis (3 caractères min)').max(200),
  description: z.string().max(1000).optional(),
  global_timer_seconds: z.number().min(5).max(300),
  use_global_timer: z.boolean(),
  questions: z.array(questionSchema),
});

type QuizFormInput = z.input<typeof quizSchema>;
type QuizFormOutput = z.output<typeof quizSchema>;

/**
 * Données soumises : les questions sont déjà au format API (sémantique de `correct_answers`
 * par type). Une question peut porter un `image_file` à téléverser une fois le quiz créé.
 */
export interface QuizFormSubmitData {
  title: string;
  description?: string;
  global_timer_seconds: number;
  use_global_timer: boolean;
  questions: PendingQuestion[];
}

interface QuizFormProps {
  initialData?: Partial<Omit<QuizFormSubmitData, 'questions'>> & {
    questions?: (Partial<QuestionPayload> & { image_url?: string | null })[];
  };
  onSubmit: (data: QuizFormSubmitData) => Promise<void> | void;
  isSubmitting?: boolean;
  /** Quiz existant : les images sont envoyées dès leur sélection. */
  quizId?: string;
  submitLabel?: string;
}

export function QuizForm({ initialData, onSubmit, isSubmitting, quizId, submitLabel = 'Créer le quiz' }: QuizFormProps) {
  const { questions: initialQuestions, ...initialQuiz } = initialData ?? {};
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuizFormInput, unknown, QuizFormOutput>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      global_timer_seconds: 30,
      use_global_timer: true,
      ...initialQuiz,
      questions: (initialQuestions ?? []).map(questionToFormValues),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const useGlobalTimer = watch('use_global_timer');

  const submit = (data: QuizFormOutput) =>
    onSubmit({ ...data, questions: data.questions.map(toPendingQuestion) });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Informations générales</h2>
        <Input label="Titre" {...register('title')} error={errors.title?.message} />
        <Input label="Description" {...register('description')} />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register('use_global_timer')}
              className="rounded border-borderc"
            />
            Utiliser un timer global
          </label>
        </div>
        {useGlobalTimer && (
          <Input
            label="Timer global (secondes)"
            type="number"
            {...register('global_timer_seconds', { valueAsNumber: true })}
            error={errors.global_timer_seconds?.message}
          />
        )}
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Questions ({fields.length})</h2>
          <Button type="button" size="sm" onClick={() => append(emptyQuestion())}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter une question
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
            quizId={quizId}
          />
        ))}
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
