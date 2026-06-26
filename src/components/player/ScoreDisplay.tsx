'use client';

import { Card } from '../ui/Card';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  rank: number;
  totalParticipants: number;
  gapToNext: number | null;
  gapToPodium: number | null;
  onPodium: boolean;
}

export function ScoreDisplay({
  score,
  rank,
  totalParticipants,
  gapToNext,
  gapToPodium,
  onPodium,
}: ScoreDisplayProps) {
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <Card className="p-6 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-500">Votre score</span>
        <span className="text-2xl font-bold">{score} pts</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl">{rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}</span>
        <span className="font-medium">
          {rank === 1 ? '1er' : `${rank}ème`} place
        </span>
        <span className="text-sm text-neutral-500">
          sur {totalParticipants} participants
        </span>
      </div>

      <div className="space-y-1 text-sm">
        {gapToNext !== null && rank > 1 && (
          <p className="text-neutral-600">
            Écart avec le devant : <span className="font-semibold">{gapToNext} pts</span>
          </p>
        )}
        {gapToPodium !== null && rank > 3 && (
          <p className="text-neutral-600">
            Distance du podium : <span className="font-semibold">{gapToPodium} pts</span>
          </p>
        )}
        {onPodium && (
          <p className="text-green-600 font-medium">🎉 Vous êtes sur le podium !</p>
        )}
      </div>
    </Card>
  );
}