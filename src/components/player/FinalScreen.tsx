'use client';

import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Leaderboard } from '../ui/Leaderboard';
import { Podium } from '../ui/Podium';
import { LeaderboardEntry } from '@/types';
import { Trophy, Medal } from 'lucide-react';

interface FinalScreenProps {
  finalLeaderboard: LeaderboardEntry[];
  yourRank: number;
  yourScore: number;
  isWinner: boolean;
  winnerPseudo: string | null;
  totalParticipants: number;
  totalQuestions: number;
  message: string;
  onPlayAgain?: () => void;
}

export function FinalScreen({
  finalLeaderboard,
  yourRank,
  yourScore,
  isWinner,
  winnerPseudo,
  totalParticipants,
  message,
  onPlayAgain,
}: FinalScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <Card className="p-8 text-center">
        <Trophy className="w-16 h-16 mx-auto text-amber-500" />
        <h1 className="text-3xl font-bold mt-4">Quiz terminé !</h1>
        <p className="text-xl mt-2">{message}</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <span className="text-neutral-500">Votre score</span>
            <p className="text-2xl font-bold">{yourScore} pts</p>
          </div>
          <div>
            <span className="text-neutral-500">Position</span>
            <p className="text-2xl font-bold">#{yourRank}</p>
          </div>
          <div>
            <span className="text-neutral-500">Participants</span>
            <p className="text-2xl font-bold">{totalParticipants}</p>
          </div>
        </div>
        {isWinner && (
          <div className="mt-4 bg-amber-100 border border-amber-300 rounded-lg py-2 px-4">
            🏆 Félicitations, vous êtes le grand gagnant !
          </div>
        )}
        {winnerPseudo && !isWinner && (
          <p className="text-sm text-neutral-500 mt-2">
            Vainqueur : <strong>{winnerPseudo}</strong>
          </p>
        )}
      </Card>

      <Podium entries={finalLeaderboard} />

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Classement final</h3>
        <Leaderboard entries={finalLeaderboard} showGaps={false} />
      </Card>

      {onPlayAgain && (
        <Button onClick={onPlayAgain} className="w-full">
          Rejouer
        </Button>
      )}
    </motion.div>
  );
}