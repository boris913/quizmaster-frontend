'use client';

import { LeaderboardEntry } from '@/types';
import { cn } from '@/lib/utils';
import { Trophy, Medal } from 'lucide-react';

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
  const display = entries.slice(0, limit);

  return (
    <div className={cn('space-y-1', className)}>
      {display.map((entry) => {
        const isCurrent = entry.participant_id === currentParticipantId;
        return (
          <div
            key={entry.participant_id}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isCurrent ? 'bg-neutral-100 border border-neutral-300' : 'hover:bg-neutral-50',
              entry.on_podium && 'border-l-4 border-amber-400'
            )}
          >
            <span className="w-8 text-sm font-medium text-neutral-500">
              {entry.rank <= 3 ? rankEmojis[entry.rank - 1] : `#${entry.rank}`}
            </span>
            <span className={cn('flex-1 font-medium', isCurrent && 'font-bold')}>
              {entry.pseudo}
              {isCurrent && <span className="ml-2 text-xs text-neutral-500">(vous)</span>}
            </span>
            <span className="font-mono font-semibold">{entry.score}</span>
            {showGaps && entry.rank > 1 && entry.gap_to_next !== null && (
              <span className="text-xs text-neutral-400">
                -{entry.gap_to_next}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}