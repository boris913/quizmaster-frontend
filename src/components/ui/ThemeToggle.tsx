'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bascule clair / sombre. Au premier passage, le thème suit le système
 * (next-themes, `defaultTheme="system"`) ; un clic fixe le choix.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('common.theme');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const label = isDark ? t('toLight') : t('toDark');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-ink/[0.05] hover:text-ink',
        className
      )}
    >
      {/* Avant montage, on affiche la lune pour éviter un saut d'icône côté serveur. */}
      {isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
