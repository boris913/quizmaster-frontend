'use client';

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Les teintes des réponses + l'accent : la fête reprend les couleurs du jeu. */
const COLORS = [
  'rgb(var(--answer-a))',
  'rgb(var(--answer-b))',
  'rgb(var(--answer-c))',
  'rgb(var(--answer-d))',
  'rgb(var(--accent))',
];

/** A small, tasteful confetti burst. Respects prefers-reduced-motion (renders nothing). */
export function Confetti({ count = 24 }: { count?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.2 + Math.random() * 0.8,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    [count]
  );

  if (shouldReduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
