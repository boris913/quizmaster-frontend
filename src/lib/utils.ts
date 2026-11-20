import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge ne connaît pas nos tailles de police nommées (tailwind.config.ts).
 * Sans cette déclaration, il range `text-body` parmi les couleurs et le fusionne
 * avec `text-on-primary` ou `text-ink` : la couleur du texte disparaît.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'card-title', 'body', 'small', 'caption'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}