'use client';

import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Leaderboard } from '../ui/Leaderboard';
import { Podium } from '../ui/Podium';
import { ScoreCounter } from '../ui/ScoreCounter';
import { CircularStat } from '../ui/CircularStat';
import { Confetti } from '../ui/Confetti';
import { LeaderboardEntry } from '@/types';
import { Trophy, RotateCcw } from 'lucide-react';

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
  /**
   * Classement masqué aux élèves : seuls le score personnel et la précision de la classe
   * sont affichés (aucun rang, podium, vainqueur ni classement).
   */
  hideRanking?: boolean;
  /** Précision de la classe (0-100), affichée en mode sans classement. */
  classAccuracy?: number | null;
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
  hideRanking = false,
  classAccuracy = null,
}: FinalScreenProps) {
  if (hideRanking) {
    return <HiddenRankingFinalScreen yourScore={yourScore} classAccuracy={classAccuracy} onPlayAgain={onPlayAgain} />;
  }

  const onPodium = yourRank > 0 && yourRank <= 3;
  const beatenPercentage =
    totalParticipants > 1 ? Math.round(((totalParticipants - yourRank) / (totalParticipants - 1)) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <Card tier="primary" className="relative overflow-hidden p-8 text-center">
        {isWinner && <Confetti />}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.1 }}
        >
          <Trophy className="w-16 h-16 mx-auto text-warning" strokeWidth={1.5} />
        </motion.div>

        <h1 className="text-h1 mt-4">Quiz terminé !</h1>
        <p className="text-body text-ink-secondary mt-2">{message}</p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-8">
          <div>
            <p className="text-small text-ink-secondary">Votre score</p>
            <p className="font-display text-display text-ink tabular-nums">
              <ScoreCounter value={yourScore} />
            </p>
          </div>
          {yourRank > 0 && totalParticipants > 0 && (
            <CircularStat
              percentage={beatenPercentage}
              label={`#${yourRank} sur ${totalParticipants}`}
              sublabel={
                totalParticipants > 1
                  ? `Devant ${beatenPercentage}% des joueurs`
                  : 'Seul participant'
              }
            />
          )}
        </div>

        {isWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-warning-50 border border-warning-100 rounded-md py-3 px-4 font-semibold text-warning"
          >
            Félicitations, vous êtes le grand gagnant !
          </motion.div>
        )}
        {winnerPseudo && !isWinner && (
          <p className="text-small text-ink-secondary mt-4">
            Vainqueur : <strong className="text-ink">{winnerPseudo}</strong>
          </p>
        )}
        {onPodium && !isWinner && (
          <p className="text-small font-medium text-success mt-2">Vous êtes sur le podium !</p>
        )}
      </Card>

      <Podium entries={finalLeaderboard} />

      <Card tier="secondary" className="p-5">
        <h3 className="text-card-title mb-3">Classement final</h3>
        <Leaderboard entries={finalLeaderboard} showGaps={false} />
      </Card>

      {onPlayAgain && (
        <Button onClick={onPlayAgain} size="lg" className="w-full">
          <RotateCcw className="w-4 h-4" />
          Rejouer
        </Button>
      )}
    </motion.div>
  );
}

function HiddenRankingFinalScreen({
  yourScore,
  classAccuracy,
  onPlayAgain,
}: {
  yourScore: number;
  classAccuracy: number | null;
  onPlayAgain?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
      data-testid="final-screen-hidden"
    >
      <Card tier="primary" className="p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.1 }}
        >
          <Trophy className="w-16 h-16 mx-auto text-warning" strokeWidth={1.5} />
        </motion.div>

        <h1 className="text-h1 mt-4">Quiz terminé !</h1>
        <p className="text-body text-ink-secondary mt-2">Merci pour votre participation.</p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-8">
          <div>
            <p className="text-small text-ink-secondary">Votre score</p>
            <p className="font-display text-display text-ink tabular-nums">
              <ScoreCounter value={yourScore} />
            </p>
          </div>
          {typeof classAccuracy === 'number' && (
            <CircularStat
              percentage={classAccuracy}
              label={`${classAccuracy} %`}
              sublabel="de bonnes réponses dans la classe"
            />
          )}
        </div>
      </Card>

      {onPlayAgain && (
        <Button onClick={onPlayAgain} size="lg" className="w-full">
          <RotateCcw className="w-4 h-4" />
          Rejouer
        </Button>
      )}
    </motion.div>
  );
}
