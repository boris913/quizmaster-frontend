'use client';

import { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Check, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAnswerLabels } from '@/i18n/answerLabel';
import { answerTone } from '@/lib/answerTone';
import { QuestionImage } from './QuestionImage';
import { SortableList } from './SortableList';
import {
  SHORT_ANSWER_MAX_LENGTH,
  normalizeQuestionType,
  trueFalseOptions,
  type QuestionType,
} from '@/types';

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    /** Tous les types du backend #7 ; un type absent ou inconnu est traité comme `single`. */
    type?: QuestionType | string;
    options?: { id: string; text: string }[];
    max_points: number;
    image_url?: string | null;
  };
  questionNumber: number;
  totalQuestions: number;
  /**
   * Réponse courante, au format attendu par `answer:submit` : ids d'options, `['true'|'false']`,
   * ids dans l'ordre choisi (`ordering`) ou `[texte]` (`short_answer`).
   */
  onSelectAnswer: (answers: string[]) => void;
  isDisabled?: boolean;
  selectedAnswers?: string[];
  /** Entrée dans le champ de réponse courte. */
  onSubmit?: () => void;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onSelectAnswer,
  isDisabled = false,
  selectedAnswers = [],
  onSubmit,
}: QuestionCardProps) {
  const t = useTranslations('player.question');
  const tc = useTranslations('common');
  const { optionText } = useAnswerLabels();
  const shouldReduceMotion = useReducedMotion();
  const type = normalizeQuestionType(question.type);
  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const options = type === 'true_false' ? trueFalseOptions(rawOptions) : rawOptions;
  const [selected, setSelected] = useState<string[]>(selectedAnswers);
  const [order, setOrder] = useState<string[]>(() =>
    selectedAnswers.length === options.length && selectedAnswers.length > 0
      ? selectedAnswers
      : options.map((o) => o.id)
  );
  const [text, setText] = useState<string>(type === 'short_answer' ? selectedAnswers[0] ?? '' : '');
  const shortAnswerId = useId();

  // Remettre dans l'ordre : l'ordre affiché (mélangé par le serveur) est déjà une réponse,
  // envoyée même si le joueur ne touche à rien (ou si le temps s'écoule).
  useEffect(() => {
    if (type === 'ordering' && order.length > 0) onSelectAnswer(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, type]);

  const handleSelect = (optionId: string) => {
    if (isDisabled) return;
    let newSelected: string[];
    if (type === 'multiple') {
      newSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
    } else {
      newSelected = [optionId];
    }
    setSelected(newSelected);
    onSelectAnswer(newSelected);
  };

  const handleReorder = (ids: string[]) => {
    if (isDisabled) return;
    setOrder(ids);
    onSelectAnswer(ids);
  };

  const handleText = (value: string) => {
    setText(value);
    const trimmed = value.trim();
    onSelectAnswer(trimmed ? [trimmed] : []);
  };

  const isSingleChoice = type !== 'multiple';

  return (
    <Card tier="primary" className="p-6 sm:p-8 space-y-7">
      <div className="flex justify-between items-start gap-4">
        <span className="text-small font-medium text-ink-secondary tabular-nums">
          {t('counter', { current: questionNumber, total: totalQuestions })}
        </span>
        {type === 'poll' ? (
          <span className="inline-flex items-center gap-1 text-caption font-medium text-ink-secondary bg-ink/[0.05] px-2 py-1 rounded-sm whitespace-nowrap">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden /> {t('pollBadge')}
          </span>
        ) : (
          <span className="text-caption font-medium text-ink-secondary bg-ink/[0.05] px-2 py-1 rounded-sm whitespace-nowrap tabular-nums">
            {tc('pointsCount', { count: question.max_points })}
          </span>
        )}
      </div>

      {/* The question is the single largest, most important element on screen */}
      <h2 className="text-h1 sm:text-display leading-tight text-ink text-balance">
        {question.text}
      </h2>

      <QuestionImage src={question.image_url} questionText={question.text} className="max-h-[40vh]" />

      {type === 'ordering' && (
        <div className="space-y-3">
          <p className="text-caption text-ink-secondary" id={`${shortAnswerId}-ordering`}>
            {t('orderingHint')}
          </p>
          <SortableList
            size="large"
            ariaLabel={t('orderingAria')}
            disabled={isDisabled}
            items={order
              .map((id) => options.find((o) => o.id === id))
              .filter((o): o is { id: string; text: string } => Boolean(o))
              .map((o) => ({ ...o, label: o.text }))}
            onChange={handleReorder}
            renderItem={(item) => <span className="text-body">{item.text}</span>}
          />
        </div>
      )}

      {type === 'short_answer' && (
        <div className="space-y-2">
          <label htmlFor={shortAnswerId} className="text-small font-medium text-ink">
            {t('yourAnswer')}
          </label>
          <input
            id={shortAnswerId}
            type="text"
            value={text}
            disabled={isDisabled}
            maxLength={SHORT_ANSWER_MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            onChange={(e) => handleText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim() && onSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
            className={cn(
              'w-full min-h-[52px] rounded-md border-2 border-borderc-strong bg-surface px-4 py-3 text-h3 text-ink placeholder:text-ink-tertiary',
              'focus:outline-none focus:border-primary focus:shadow-glow disabled:opacity-60'
            )}
            placeholder={t('typeHere')}
          />
        </div>
      )}

      {type !== 'ordering' && type !== 'short_answer' && (
        <div
          className={cn('grid gap-3', type === 'true_false' ? 'grid-cols-2' : 'sm:grid-cols-2')}
          role={isSingleChoice ? 'radiogroup' : 'group'}
          aria-label={t('answersAria')}
        >
          {options.map((option, i) => {
            const isSelected = selected.includes(option.id);
            const tone = answerTone(option.id, i);
            const isTrueFalse = type === 'true_false';
            return (
              <motion.button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={isDisabled}
                role={isSingleChoice ? 'radio' : 'checkbox'}
                aria-checked={isSelected}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : i * 0.05, duration: 0.25 }}
                whileTap={isDisabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
                className={cn(
                  'w-full min-h-[64px] text-left px-4 py-4 rounded-xl border-2 transition-colors flex items-center gap-3',
                  isTrueFalse && 'justify-center text-center min-h-[72px] text-h3 font-semibold',
                  isSelected
                    ? isTrueFalse
                      ? 'border-primary bg-primary-50'
                      : cn(tone.border, tone.soft)
                    : 'border-borderc bg-surface hover:border-borderc-strong',
                  isDisabled && isSelected && 'opacity-90',
                  isDisabled && !isSelected && 'opacity-50'
                )}
              >
                {type !== 'true_false' && (
                  <span
                    className={cn(
                      'font-display text-body font-bold min-w-9 h-9 flex items-center justify-center rounded-md text-white',
                      tone.bg
                    )}
                  >
                    {option.id}
                  </span>
                )}
                <span className={cn('text-ink', isTrueFalse ? '' : 'text-body font-medium flex-1')}>{optionText(option.text)}</span>
                {isSelected && !isDisabled && (
                  <motion.span
                    initial={shouldReduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Check className={cn('w-5 h-5', isTrueFalse ? 'text-primary' : tone.text)} strokeWidth={2.5} />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {type === 'multiple' && !isDisabled && (
        <p className="text-caption text-ink-secondary">
          {t('multipleHint')}
        </p>
      )}
      {type === 'poll' && !isDisabled && (
        <p className="text-caption text-ink-secondary">{t('pollHint')}</p>
      )}
    </Card>
  );
}
