'use client';

import { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useLocalizedMessage } from '@/i18n/localizeMessage';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SortableList } from '../ui/SortableList';
import { QuestionImageField } from './QuestionImageField';
import { Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QUESTION_TYPES,
  SHORT_ANSWER_MAX_VARIANTS,
  SHORT_ANSWER_VARIANT_MAX_LENGTH,
  TRUE_FALSE_OPTIONS,
  type QuestionType,
  type QuizOption,
} from '@/types';
import { changeQuestionType, nextOptionId } from './questionSchema';

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
  /** Quiz déjà créé : les images sont envoyées tout de suite (sinon à l'enregistrement). */
  quizId?: string;
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
  quizId,
}: QuestionBuilderProps) {
  const t = useTranslations('quizForm.question');
  const tq = useTranslations('questionTypes');
  const tc = useTranslations('common');
  const localize = useLocalizedMessage();
  const path = `questions.${index}`;
  const options: QuizOption[] = watch(`${path}.options`) || [];
  const correctAnswers: string[] = watch(`${path}.correct_answers`) || [];
  const type: QuestionType = watch(`${path}.type`) || 'single';
  const text: string = watch(`${path}.text`) || '';
  const imageUrl: string | null = watch(`${path}.image_url`) || null;
  const imageFile: File | null = watch(`${path}.image_file`) || null;
  const explanation: string = watch(`${path}.explanation`) || '';
  const explanationId = `questions-${index}-explanation`;
  const typeGroupName = `questions-${index}-type`;

  const set = (name: string, value: unknown) =>
    setValue(`${path}.${name}`, value, { shouldDirty: true });

  const selectType = (next: QuestionType) => {
    if (next === type) return;
    const changed = changeQuestionType({ type, options, correct_answers: correctAnswers }, next);
    set('options', changed.options);
    set('correct_answers', changed.correct_answers);
    set('type', next);
  };

  const toggleCorrect = (optionId: string) => {
    if (type === 'single') {
      set('correct_answers', [optionId]);
    } else {
      set(
        'correct_answers',
        correctAnswers.includes(optionId)
          ? correctAnswers.filter((id) => id !== optionId)
          : [...correctAnswers, optionId]
      );
    }
  };

  const setOptionText = (optionId: string, value: string) =>
    set(
      'options',
      options.map((o) => (o.id === optionId ? { ...o, text: value } : o))
    );

  const addOption = () => {
    const id = nextOptionId(options, type);
    if (id) set('options', [...options, { id, text: '' }]);
  };

  const removeOption = (optionId: string) => {
    set('options', options.filter((o) => o.id !== optionId));
    set('correct_answers', correctAnswers.filter((id) => id !== optionId));
  };

  const reorderOptions = (ids: string[]) =>
    set(
      'options',
      ids.map((id) => options.find((o) => o.id === id)!).filter(Boolean)
    );

  const minOptions = QUESTION_MIN_OPTIONS[type];
  const canAddOption = options.length < QUESTION_MAX_OPTIONS[type] && nextOptionId(options, type) !== null;
  const canRemoveOption = options.length > minOptions;

  const optionInput = (opt: QuizOption, placeholder: string) => (
    <div className="flex flex-1 items-center gap-2">
      <Input
        aria-label={t('optionAria', { id: opt.id })}
        placeholder={placeholder}
        value={opt.text}
        maxLength={300}
        onChange={(e) => setOptionText(opt.id, e.target.value)}
        className="flex-1"
      />
      {canRemoveOption && (
        <button
          type="button"
          onClick={() => removeOption(opt.id)}
          aria-label={t('removeOption', { id: opt.id })}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-ink/[0.05] hover:text-danger"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );

  const variants = correctAnswers.length > 0 ? correctAnswers : [''];

  return (
    <Card className="p-4 space-y-4 border-borderc" data-testid={`question-builder-${index}`}>
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{t('title', { number: index + 1 })}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={t('remove', { number: index + 1 })}>
          <Trash2 className="w-4 h-4 text-danger" aria-hidden />
        </Button>
      </div>

      <Input
        label={t('text')}
        id={`questions-${index}-text`}
        {...register(`${path}.text`)}
        error={localize(errors?.text?.message)}
      />

      <fieldset className="space-y-2">
        <legend className="text-small font-medium text-ink">{t('typeLegend')}</legend>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((qt) => (
            <label
              key={qt}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-small transition-colors',
                type === qt ? 'border-primary bg-primary-50 text-primary-700' : 'border-borderc hover:border-borderc-strong'
              )}
            >
              <input
                type="radio"
                name={typeGroupName}
                value={qt}
                checked={type === qt}
                onChange={() => selectType(qt)}
                className="sr-only"
              />
              {tq(qt)}
            </label>
          ))}
        </div>
        <p className="text-caption text-ink-secondary">{t(`hint.${type}`)}</p>
      </fieldset>

      <QuestionImageField
        quizId={quizId}
        imageUrl={imageUrl}
        file={imageFile}
        alt={text}
        onChange={({ imageUrl: url, file }) => {
          set('image_url', url);
          set('image_file', file ?? undefined);
        }}
      />

      {/* Éditeur adapté au type */}
      {type === 'true_false' && (
        <div className="space-y-2">
          <p className="text-small font-medium" id={`questions-${index}-tf`}>
            {t('correctAnswer')}
          </p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={`questions-${index}-tf`}>
            {TRUE_FALSE_OPTIONS.map((opt) => {
              const checked = correctAnswers[0] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => set('correct_answers', [opt.id])}
                  className={cn(
                    'min-h-[44px] rounded-md border-2 px-4 py-3 font-semibold transition-colors',
                    checked ? 'border-success bg-success-50 text-success' : 'border-borderc hover:border-primary/40'
                  )}
                >
                  {opt.id === 'false' ? tc('false') : tc('true')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {type === 'ordering' && (
        <div className="space-y-2">
          <p className="text-small font-medium">{t('orderingItems')}</p>
          <SortableList
            ariaLabel={t('orderingAria')}
            items={options.map((o) => ({ ...o, label: o.text || t('optionAria', { id: o.id }) }))}
            onChange={reorderOptions}
            renderItem={(opt) => optionInput(opt, t('itemPlaceholder', { id: opt.id }))}
          />
        </div>
      )}

      {(type === 'single' || type === 'multiple' || type === 'poll') && (
        <div className="space-y-2">
          <p className="text-small font-medium">{t('options')}</p>
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <span className="w-6 font-display font-semibold text-small">{opt.id}</span>
              {optionInput(opt, t('optionPlaceholder', { id: opt.id }))}
              {type !== 'poll' && (
                <button
                  type="button"
                  onClick={() => toggleCorrect(opt.id)}
                  aria-pressed={correctAnswers.includes(opt.id)}
                  aria-label={t('markCorrectAria', { id: opt.id })}
                  className={cn(
                    'px-2 py-1 text-caption rounded-sm border transition-colors',
                    correctAnswers.includes(opt.id)
                      ? 'bg-success-50 border-success text-success'
                      : 'bg-surface border-borderc text-ink-tertiary'
                  )}
                >
                  {correctAnswers.includes(opt.id) ? t('correct') : t('markCorrect')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {type !== 'true_false' && type !== 'short_answer' && canAddOption && (
        <Button type="button" variant="ghost" size="sm" onClick={addOption}>
          <Plus className="w-4 h-4" /> {t('addOption')}
        </Button>
      )}

      {type === 'short_answer' && (
        <div className="space-y-2">
          <p className="text-small font-medium">{t('acceptedAnswers')}</p>
          {variants.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={t('acceptedAria', { number: i + 1 })}
                placeholder={i === 0 ? t('acceptedFirstPlaceholder') : t('acceptedOtherPlaceholder')}
                value={value}
                maxLength={SHORT_ANSWER_VARIANT_MAX_LENGTH}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = e.target.value;
                  set('correct_answers', next);
                }}
                className="flex-1"
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => set('correct_answers', variants.filter((_, j) => j !== i))}
                  aria-label={t('removeAccepted', { number: i + 1 })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-ink/[0.05] hover:text-danger"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
          {variants.length < SHORT_ANSWER_MAX_VARIANTS && (
            <Button type="button" variant="ghost" size="sm" onClick={() => set('correct_answers', [...variants, ''])}>
              <Plus className="w-4 h-4" /> {t('addVariant')}
            </Button>
          )}
        </div>
      )}

      {errors?.options?.message && <p className="text-small text-danger">{localize(errors.options.message)}</p>}
      {errors?.correct_answers?.message && (
        <p className="text-small text-danger">{localize(errors.correct_answers.message)}</p>
      )}

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
          {...register(`${path}.explanation`)}
        />
        <p id={`${explanationId}-count`} className="text-caption text-ink-secondary text-right">
          {explanation.length}/{QUESTION_EXPLANATION_MAX_LENGTH}
        </p>
        {errors?.explanation?.message && (
          <p className="text-small text-danger">{localize(errors.explanation.message)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={type === 'poll' ? t('maxPointsPoll') : t('maxPoints')}
          id={`questions-${index}-points`}
          type="number"
          {...register(`${path}.max_points`, { valueAsNumber: true })}
          error={localize(errors?.max_points?.message)}
        />
        {!useGlobalTimer && (
          <Input
            label={t('timer')}
            id={`questions-${index}-timer`}
            type="number"
            {...register(`${path}.timer_seconds`, { valueAsNumber: true })}
            error={localize(errors?.timer_seconds?.message)}
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
