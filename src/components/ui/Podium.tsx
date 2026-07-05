'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/utils';

interface PodiumProps {
  entries: LeaderboardEntry[];
  currentParticipantId?: string;
}

export function Podium({ entries, currentParticipantId }: PodiumProps) {
  const shouldReduceMotion = useReducedMotion();
  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

  return (
    <div className="flex items-end justify-center gap-4 py-6" aria-label="Podium">
      {podiumOrder.map((entry, index) => {
        if (!entry) return null;
        const isCurrent = entry.participant_id === currentParticipantId;
        const heights = [140, 180, 110];
        const medals = ['🥈', '🥇', '🥉'];
        const realRank = index === 0 ? 2 : index === 1 ? 1 : 3;
        const isFirst = realRank === 1;

        return (
          <motion.div
            key={entry.participant_id}
            initial={shouldReduceMotion ? false : { y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.12, type: 'spring', stiffness: 260, damping: 20 }}
            className="flex flex-col items-center"
          >
            {isFirst && (
              <motion.span
                className="text-3xl mb-1"
                animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                👑
              </motion.span>
            )}
            <div
              className={cn(
                'flex flex-col items-center justify-end px-4 rounded-t-lg transition-all',
                isFirst ? 'gradient-primary shadow-lg' : 'bg-black/[0.04]',
                isCurrent && !isFirst && 'ring-2 ring-primary',
                realRank === 1 && 'w-24',
                realRank === 2 && 'w-20',
                realRank === 3 && 'w-20'
              )}
              style={{ height: heights[index] }}
            >
              <span className="text-3xl mb-3">{medals[index]}</span>
            </div>
            <div className="mt-2 text-center">
              <p className="text-small font-semibold text-ink truncate max-w-[6rem]">{entry.pseudo}</p>
              <p className="text-caption text-ink-secondary">{entry.score} pts</p>
              {isCurrent && <span className="text-caption text-primary font-medium">← vous</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
