'use client';

import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface PodiumProps {
  entries: LeaderboardEntry[];
  currentParticipantId?: string;
}

export function Podium({ entries, currentParticipantId }: PodiumProps) {
  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {podiumOrder.map((entry, index) => {
        if (!entry) return null;
        const isCurrent = entry.participant_id === currentParticipantId;
        const heights = [160, 200, 120];
        const medals = ['🥈', '🥇', '🥉'];
        const realRank = index === 0 ? 2 : index === 1 ? 1 : 3;

        return (
          <motion.div
            key={entry.participant_id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div
              className={cn(
                'flex flex-col items-center justify-end px-4 rounded-t-lg transition-all',
                isCurrent ? 'bg-neutral-200' : 'bg-neutral-100',
                realRank === 1 && 'w-24',
                realRank === 2 && 'w-20',
                realRank === 3 && 'w-20'
              )}
              style={{ height: heights[index] }}
            >
              <span className="text-3xl">{medals[index]}</span>
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm font-semibold">{entry.pseudo}</p>
              <p className="text-xs text-neutral-500">{entry.score} pts</p>
              {isCurrent && (
                <span className="text-xs text-blue-600">← vous</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}