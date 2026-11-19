import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('concatène les classes', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('ignore les valeurs falsy et accepte objets et tableaux (clsx)', () => {
    const isActive = false as boolean;
    expect(cn('a', isActive && 'b', null, undefined, { c: true, d: false }, ['e', ['f']])).toBe(
      'a c e f'
    );
  });

  it('résout les conflits Tailwind en gardant la dernière classe (tailwind-merge)', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('renvoie une chaîne vide sans argument', () => {
    expect(cn()).toBe('');
  });
});
