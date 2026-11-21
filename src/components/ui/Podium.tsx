'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { RankBadge } from './RankBadge';

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
                className="mb-1 text-medal-gold"
                initial={shouldReduceMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 14 }}
                aria-hidden
              >
                <Crown className="h-7 w-7" strokeWidth={1.75} />
              </motion.span>
            )}
            <div
              className={cn(
                'flex flex-col items-center justify-end px-4 rounded-t-lg transition-all',
                isFirst ? 'bg-primary' : 'bg-ink/[0.06]',
                isCurrent && !isFirst && 'ring-2 ring-primary',
                realRank === 1 && 'w-24',
                realRank === 2 && 'w-20',
                realRank === 3 && 'w-20'
              )}
              style={{ height: heights[index] }}
            >
              <RankBadge rank={realRank} size="lg" className="mb-3" />
            </div>
            <div className="mt-2 text-center">
              <p className="text-small font-semibold text-ink truncate max-w-[6rem]">{entry.pseudo}</p>
              <p className="text-caption text-ink-secondary tabular-nums">{entry.score} pts</p>
              {isCurrent && <span className="text-caption text-primary font-medium">vous</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
