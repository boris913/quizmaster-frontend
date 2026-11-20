'use client';

import { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { QuestionImage } from './QuestionImage';
import { SortableList } from './SortableList';
import { BarChart3, Check } from 'lucide-react';
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
        <span className="text-caption font-semibold text-primary uppercase tracking-wide">
          Question {questionNumber} / {totalQuestions}
        </span>
        {type === 'poll' ? (
          <span className="inline-flex items-center gap-1 text-caption font-medium text-ink-secondary bg-black/[0.04] px-2.5 py-1 rounded-full whitespace-nowrap">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Sondage · non noté
          </span>
        ) : (
          <span className="text-caption font-medium text-ink-secondary bg-black/[0.04] px-2.5 py-1 rounded-full whitespace-nowrap">
            {question.max_points} pts
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
            Remettez les éléments dans le bon ordre : glissez la poignée, ou utilisez les flèches haut et bas.
          </p>
          <SortableList
            size="large"
            ariaLabel="Éléments à remettre dans l'ordre"
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
            Votre réponse
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
              'w-full min-h-[52px] rounded-md border-2 border-borderc bg-surface px-4 py-3 text-h3',
              'focus:outline-none focus:border-primary focus:shadow-glow disabled:opacity-60'
            )}
            placeholder="Tapez votre réponse"
          />
        </div>
      )}

      {type !== 'ordering' && type !== 'short_answer' && (
        <div
          className={cn(type === 'true_false' ? 'grid grid-cols-2 gap-3' : 'space-y-3')}
          role={isSingleChoice ? 'radiogroup' : 'group'}
          aria-label="Réponses"
        >
          {options.map((option, i) => {
            const isSelected = selected.includes(option.id);
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
                whileHover={isDisabled || shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={isDisabled || shouldReduceMotion ? undefined : { scale: 0.99 }}
                className={cn(
                  'w-full min-h-[44px] text-left px-5 py-4 rounded-md border-2 transition-colors flex items-center gap-3',
                  type === 'true_false' && 'justify-center text-center min-h-[72px] text-h3 font-semibold',
                  isSelected && !isDisabled
                    ? 'border-primary bg-primary-50'
                    : 'border-borderc hover:border-primary/40 bg-surface',
                  isDisabled && isSelected && 'opacity-90',
                  isDisabled && !isSelected && 'opacity-50'
                )}
              >
                {type !== 'true_false' && (
                  <span
                    className={cn(
                      'font-mono text-small font-semibold min-w-8 h-8 flex items-center justify-center rounded-md',
                      isSelected ? 'bg-primary text-white' : 'bg-black/[0.05] text-ink-secondary'
                    )}
                  >
                    {option.id}
                  </span>
                )}
                <span className={cn(type === 'true_false' ? '' : 'text-body flex-1')}>{option.text}</span>
                {isSelected && !isDisabled && (
                  <motion.span
                    initial={shouldReduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Check className="w-5 h-5 text-primary" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {type === 'multiple' && !isDisabled && (
        <p className="text-caption text-ink-secondary">
          Sélectionnez plusieurs réponses (cliquez à nouveau pour désélectionner)
        </p>
      )}
      {type === 'poll' && !isDisabled && (
        <p className="text-caption text-ink-secondary">Pas de bonne ou de mauvaise réponse : donnez votre avis.</p>
      )}
    </Card>
  );
}
