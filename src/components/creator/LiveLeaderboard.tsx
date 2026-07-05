'use client';

import { LeaderboardEntry } from '@/types';
import { Leaderboard } from '../ui/Leaderboard';
import { Podium } from '../ui/Podium';
import { Card } from '../ui/Card';
import { Users } from 'lucide-react';

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  totalParticipants: number;
  currentQuestion: number;
  totalQuestions: number;
}

export function LiveLeaderboard({
  entries,
  totalParticipants,
  currentQuestion,
  totalQuestions,
}: LiveLeaderboardProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Classement ({totalParticipants} participants)
        </h3>
        <span className="text-sm text-ink-secondary">
          Q{currentQuestion + 1}/{totalQuestions}
        </span>
      </div>

      {entries.length > 0 && (
        <Podium entries={entries} />
      )}

      <Leaderboard entries={entries} showGaps />
    </Card>
  );
}