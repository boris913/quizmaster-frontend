'use client';

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { answerLabel as baseAnswerLabel, type QuizOption } from '@/types';

/**
 * Libellés des réponses Vrai / Faux. `answerLabel` (src/types) et les options fixes du
 * serveur renvoient « Vrai » / « Faux » : hors français, on les remplace à l'affichage.
 */
export function useAnswerLabels() {
  const locale = useLocale();
  const tc = useTranslations('common');

  /** Texte d'option affiché : traduit « Vrai » / « Faux » hors français, inchangé sinon. */
  const optionText = useCallback(
    (text: string): string => {
      if (locale === 'fr') return text;
      if (text === 'Vrai') return tc('true');
      if (text === 'Faux') return tc('false');
      return text;
    },
    [locale, tc]
  );

  const answerLabel = useCallback(
    (id: string, options: QuizOption[] | null | undefined): string => optionText(baseAnswerLabel(id, options)),
    [optionText]
  );

  return { answerLabel, optionText };
}
