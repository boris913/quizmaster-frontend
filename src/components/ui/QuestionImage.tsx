'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuestionImageProps {
  src: string | null | undefined;
  /** Énoncé de la question, repris dans le texte alternatif. */
  questionText?: string;
  className?: string;
}

/**
 * Image d'illustration d'une question (joueur, créateur, projection). `<img>` natif :
 * l'image vient d'un bucket Supabase dont le domaine n'est pas connu au build (`next/image`
 * exigerait de le déclarer). Chargement différé, texte alternatif, masquée si elle ne charge pas.
 */
export function QuestionImage({ src, questionText, className }: QuestionImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={questionText ? `Illustration de la question : ${questionText}` : 'Illustration de la question'}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('mx-auto block h-auto max-w-full rounded-md object-contain', className)}
      data-testid="question-image"
    />
  );
}
