'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentParticipantId?: string;
  limit?: number;
  showGaps?: boolean;
  className?: string;
}

const rankEmojis = ['🥇', '🥈', '🥉'];

export function Leaderboard({
  entries,
  currentParticipantId,
  limit = 10,
  showGaps = true,
  className,
}: LeaderboardProps) {
  const shouldReduceMotion = useReducedMotion();
  const display = entries.slice(0, limit);

  return (
    <div className={cn('space-y-1.5', className)} role="list" aria-label="Classement">
      <AnimatePresence initial={false}>
        {display.map((entry) => {
          const isCurrent = entry.participant_id === currentParticipantId;
          return (
            <motion.div
              key={entry.participant_id}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              role="listitem"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                isCurrent ? 'bg-primary-50 border border-primary-200' : 'hover:bg-black/[0.02]',
                entry.on_podium && 'border-l-4 border-warning'
              )}
            >
              <span className="w-8 text-small font-semibold text-ink-secondary tabular-nums">
                {entry.rank <= 3 ? rankEmojis[entry.rank - 1] : `#${entry.rank}`}
              </span>
              <span className={cn('flex-1 text-body font-medium truncate', isCurrent && 'font-bold text-primary-700')}>
                {entry.pseudo}
                {isCurrent && <span className="ml-2 text-caption text-ink-secondary">(vous)</span>}
              </span>
              <span className="font-mono font-semibold tabular-nums">{entry.score}</span>
              {showGaps && entry.rank > 1 && entry.gap_to_next !== null && (
                <span className="text-caption text-ink-secondary/70 tabular-nums">
                  -{entry.gap_to_next}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
