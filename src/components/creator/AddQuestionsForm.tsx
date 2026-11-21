'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';
import { QuestionBuilder } from './QuestionBuilder';
import { emptyQuestion, questionSchema, toPendingQuestion } from './questionSchema';
import type { QuestionPayload } from '@/types';

const schema = z.object({ questions: z.array(questionSchema).min(1, 'Ajoutez au moins une question') });

interface AddQuestionsFormProps {
  quizId: string;
  useGlobalTimer: boolean;
  globalTimer: number;
  onSubmit: (questions: QuestionPayload[]) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * Ajout de questions à un quiz existant : le quiz a un id, les images sont donc envoyées
 * dès leur sélection via l'URL signée (aucun fichier en attente à la soumission).
 */
export function AddQuestionsForm({
  quizId,
  useGlobalTimer,
  globalTimer,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddQuestionsFormProps) {
  const t = useTranslations('addQuestions');
  const tc = useTranslations('common');
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { questions: [emptyQuestion()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const submit = (data: z.output<typeof schema>) =>
    onSubmit(
      data.questions.map((q) => {
        const payload: QuestionPayload & { image_file?: File } = toPendingQuestion(q);
        delete payload.image_file;
        return payload;
      })
    );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" aria-label="Ajouter des questions">
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
          globalTimer={globalTimer}
          quizId={quizId}
        />
      ))}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyQuestion())}>
          <Plus className="w-4 h-4" /> {t('another')}
        </Button>
        <Button type="submit" size="sm" isLoading={isSubmitting} disabled={fields.length === 0}>
          {t('save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {tc('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
