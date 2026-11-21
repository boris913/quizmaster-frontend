'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';
import { MAX_NICKNAME_DRAWS } from '@/lib/nickname';

interface NicknameRouletteProps {
  /** Propositions renvoyées par le serveur (3 au plus). Chaque tirage révèle la suivante. */
  suggestions: string[];
  /** Pseudo actuellement retenu (dernier tirage), ou chaîne vide. */
  value: string;
  onChange: (nickname: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Roulette des pseudos générés : le joueur tire jusqu'à 3 pseudos parmi les propositions du
 * serveur ; le dernier tiré est celui qui sera envoyé. Boutons natifs (clavier : Tab puis
 * Entrée ou Espace) et annonce du pseudo tiré via une région `aria-live`.
 */
export function NicknameRoulette({ suggestions, value, onChange, error, disabled }: NicknameRouletteProps) {
  const t = useTranslations('join.roulette');
  const shouldReduceMotion = useReducedMotion();
  // Le parent remonte le composant (prop `key`) à chaque nouvelle série de propositions.
  const [draws, setDraws] = useState(0);

  const maxDraws = Math.min(MAX_NICKNAME_DRAWS, suggestions.length);
  const remaining = Math.max(0, maxDraws - draws);
  const exhausted = remaining === 0;

  const handleDraw = () => {
    if (exhausted || disabled) return;
    const next = suggestions[draws];
    setDraws(draws + 1);
    onChange(next);
  };

  const buttonLabel = draws === 0 ? t('spin', { remaining }) : t('respin', { remaining });
  const errorId = 'nickname-roulette-error';
  const hintId = 'nickname-roulette-hint';

  return (
    <div role="group" aria-labelledby="nickname-roulette-label" className="space-y-2">
      <p id="nickname-roulette-label" className="text-small font-medium text-ink">
        {t('label')}
      </p>
      <p id={hintId} className="text-caption text-ink-secondary">
        {t('hint', { max: MAX_NICKNAME_DRAWS })}
      </p>

      <div
        className="flex min-h-[56px] items-center justify-center overflow-hidden rounded-md border border-borderc bg-surface px-3 py-2"
        aria-live="polite"
        aria-atomic="true"
        data-testid="nickname-roulette-value"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value || 'empty'}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className={value ? 'text-h3 font-semibold text-ink' : 'text-small text-ink-secondary'}
          >
            {value || t('empty')}
          </motion.span>
        </AnimatePresence>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleDraw}
        disabled={disabled || exhausted}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      >
        <Dices className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </Button>

      {exhausted && value && (
        <p className="text-caption text-ink-secondary">{t('exhausted')}</p>
      )}
      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
