'use client';

import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { ScoreCounter } from '../ui/ScoreCounter';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  rank: number;
  totalParticipants: number;
  gapToNext: number | null;
  gapToPodium: number | null;
  onPodium: boolean;
}

const rankEmojis = ['🥇', '🥈', '🥉'];

export function ScoreDisplay({
  score,
  rank,
  totalParticipants,
  gapToNext,
  gapToPodium,
  onPodium,
}: ScoreDisplayProps) {
  return (
    <Card tier="secondary" className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-small text-ink-secondary font-medium">Votre score</span>
        <span className="text-h2 font-bold tabular-nums">
          <ScoreCounter value={score} /> <span className="text-small font-medium text-ink-secondary">pts</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl">{rank > 0 && rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}</span>
        <span className="font-semibold">
          {rank === 1 ? '1re' : `${rank}e`} place
        </span>
        <span className="text-small text-ink-secondary">sur {totalParticipants} participants</span>
      </div>

      {(gapToNext !== null && rank > 1) || (gapToPodium !== null && rank > 3) || onPodium ? (
        <div className="space-y-1.5 text-small pt-1 border-t border-borderc">
          {gapToNext !== null && rank > 1 && (
            <p className="text-ink-secondary pt-2">
              Écart avec le devant : <span className="font-semibold text-ink">{gapToNext} pts</span>
            </p>
          )}
          {gapToPodium !== null && rank > 3 && (
            <p className="text-ink-secondary">
              Distance du podium : <span className="font-semibold text-ink">{gapToPodium} pts</span>
            </p>
          )}
          {onPodium && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn('font-semibold text-success')}
            >
              🎉 Vous êtes sur le podium !
            </motion.p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
