'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { QuestionBuilder } from './QuestionBuilder';
import { Plus } from 'lucide-react';

const questionSchema = z.object({
  text: z.string().min(1, 'Texte requis'),
  type: z.enum(['single', 'multiple']),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, 'Option requise'),
  })).min(2, 'Au moins 2 options'),
  correct_answers: z.array(z.string()).min(1, 'Au moins une bonne réponse'),
  max_points: z.number().min(10).max(1000),
  timer_seconds: z.number().min(5).max(300).optional(),
});

const quizSchema = z.object({
  title: z.string().min(3, 'Titre requis (3 caractères min)').max(200),
  description: z.string().max(1000).optional(),
  global_timer_seconds: z.number().min(5).max(300),
  use_global_timer: z.boolean(),
  questions: z.array(questionSchema),
});

type QuizFormData = z.infer<typeof quizSchema>;

interface QuizFormProps {
  initialData?: Partial<QuizFormData>;
  onSubmit: (data: QuizFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function QuizForm({ initialData, onSubmit, isSubmitting }: QuizFormProps) {
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
        <h2 className="text-lg font-semibold">Informations générales</h2>
        <Input label="Titre" {...register('title')} error={errors.title?.message} />
        <Input label="Description" {...register('description')} />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register('use_global_timer')}
              className="rounded border-neutral-300"
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
            })}
          >
            <Plus className="w-4 h-4 mr-1" /> Ajouter une question
          </Button>
        </div>

        {fields.map((field, index) => (
          <QuestionBuilder
            key={field.id}
            index={index}
            control={control as any} // ✅ résout l'incompatibilité de type
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
        Créer le quiz
      </Button>
    </form>
  );
}
