'use client';

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Messages de validation produits en français par la logique métier (src/types,
 * questionSchema, images) et vérifiés tels quels par les tests. Plutôt que de changer
 * ce contrat, on les traduit à l'affichage : chaque motif connu est associé à une clé
 * de `validation.*`. Hors français, un message inconnu est affiché tel quel.
 */
const PATTERNS: { re: RegExp; key: string; params?: (m: RegExpMatchArray) => Record<string, string | number> }[] = [
  { re: /^Texte requis$/, key: 'textRequired' },
  { re: /^Titre requis \(3 caractères min\.?\)$/, key: 'titleRequired' },
  { re: /^(\d+) caractères maximum$/, key: 'maxChars', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^Choisissez Vrai ou Faux$/, key: 'chooseTrueFalse' },
  { re: /^Au moins une réponse acceptée$/, key: 'minAccepted' },
  { re: /^(\d+) réponses acceptées au plus$/, key: 'maxAccepted', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^(\d+) caractères au plus par réponse acceptée$/, key: 'acceptedMaxChars', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^Au moins (\d+) options, toutes renseignées$/, key: 'minOptions', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^(\d+) options au plus$/, key: 'maxOptions', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^Au moins une bonne réponse$/, key: 'minCorrect' },
  { re: /^Format non accepté : PNG, JPEG, WebP ou GIF uniquement\.$/, key: 'imageFormat' },
  { re: /^Image trop lourde : 2 Mo maximum\.$/, key: 'imageTooBig' },
  { re: /^Échec de l'envoi de l'image\.$/, key: 'imageUpload' },
  { re: /^Ajoutez au moins une question$/, key: 'atLeastOneQuestion' },
  { re: /^Indiquez une date et une heure d’échéance\.$/, key: 'dueRequired' },
  { re: /^L’échéance doit être au moins 15 minutes après maintenant\.$/, key: 'dueTooSoon' },
  { re: /^L’échéance ne peut pas dépasser (\d+) jours\.$/, key: 'dueTooFar', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^Number must be greater than or equal to (\d+)$/, key: 'min', params: (m) => ({ count: Number(m[1]) }) },
  { re: /^Number must be less than or equal to (\d+)$/, key: 'max', params: (m) => ({ count: Number(m[1]) }) },
];

export function useLocalizedMessage() {
  const locale = useLocale();
  const t = useTranslations('validation');
  return useCallback(
    (message: string | null | undefined): string | undefined => {
      if (!message) return undefined;
      // Zod renvoie ses messages par défaut en anglais : on les traduit aussi en français.
      for (const p of PATTERNS) {
        const m = message.match(p.re);
        if (m) {
          if (locale === 'fr' && !p.key.match(/^(min|max)$/)) return message;
          return t(p.key, p.params?.(m));
        }
      }
      return message;
    },
    [locale, t]
  );
}
