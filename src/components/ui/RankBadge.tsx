'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const medalStyles: Record<number, string> = {
  1: 'bg-medal-gold text-white',
  2: 'bg-medal-silver text-ink dark:text-background',
  3: 'bg-medal-bronze text-white',
};

/**
 * Rang d'un joueur. Les trois premiers reçoivent une pastille aux couleurs
 * des médailles ; les suivants, un simple numéro. Remplace les emojis.
 */
export function RankBadge({ rank, size = 'md', className }: { rank: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const t = useTranslations('common.medal');
  const dims = size === 'sm' ? 'h-6 min-w-6 text-caption' : size === 'lg' ? 'h-10 min-w-10 text-body' : 'h-7 min-w-7 text-small';
  if (rank >= 1 && rank <= 3) {
    return (
      <span
        className={cn('inline-flex items-center justify-center rounded-full px-1 font-display font-bold tabular-nums', dims, medalStyles[rank], className)}
        title={t(String(rank) as '1' | '2' | '3')}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full px-1 font-semibold tabular-nums text-ink-secondary', dims, className)}>
      #{rank}
    </span>
  );
}
