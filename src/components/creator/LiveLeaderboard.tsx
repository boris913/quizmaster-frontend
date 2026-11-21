'use client';

import { LeaderboardEntry } from '@/types';
import { Leaderboard } from '../ui/Leaderboard';
import { Podium } from '../ui/Podium';
import { Card } from '../ui/Card';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('participants');
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t('leaderboardTitle', { count: totalParticipants })}
        </h3>
        <span className="text-small text-ink-secondary tabular-nums">
          {t('questionShort', { current: currentQuestion + 1, total: totalQuestions })}
        </span>
      </div>

      {entries.length > 0 && (
        <Podium entries={entries} />
      )}

      <Leaderboard entries={entries} showGaps />
    </Card>
  );
}