'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Participant } from '@/types';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';
import { ScoreCounter } from '../ui/ScoreCounter';
import { Users, CheckCircle, Clock, UserX } from 'lucide-react';

interface ParticipantListProps {
  participants: Participant[];
  progressMap?: Record<string, number>; // participantId -> answered count
  /** Live score-by-participant map (e.g. from the real-time leaderboard) that overrides participant.score. */
  liveScores?: Record<string, number>;
}

const statusIcon = {
  waiting: <Clock className="w-3 h-3 text-ink-secondary/70" />,
  answering: <Clock className="w-3 h-3 text-warning animate-pulse" />,
  answered: <CheckCircle className="w-3 h-3 text-success" />,
  timeout: <UserX className="w-3 h-3 text-danger" />,
  disconnected: <UserX className="w-3 h-3 text-ink-secondary/70" />,
};

const statusLabel = {
  waiting: 'En attente',
  answering: 'En cours',
  answered: 'Répondu',
  timeout: 'Timeout',
  disconnected: 'Déconnecté',
};

export function ParticipantList({ participants, progressMap = {}, liveScores = {} }: ParticipantListProps) {
  const shouldReduceMotion = useReducedMotion();

  // Le score en direct (issu du classement temps réel) prime toujours sur la valeur
  // potentiellement obsolète stockée sur le participant.
  const withLiveScore = participants.map((p) => ({
    ...p,
    score: liveScores[p.id] ?? p.score,
  }));
  const sorted = [...withLiveScore].sort((a, b) => b.score - a.score);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" />
        Participants ({participants.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {sorted.map((p) => {
            const progress = progressMap[p.id] || 0;
            return (
              <motion.div
                key={p.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center gap-3 text-small"
              >
                <span className="w-5 text-ink-secondary/70 font-mono">
                  {statusIcon[p.status]}
                </span>
                <span className="flex-1 font-medium truncate">{p.pseudo}</span>
                <span className="text-caption text-ink-secondary">
                  {statusLabel[p.status]}
                </span>
                <span className="font-mono font-semibold min-w-12 text-right tabular-nums">
                  <ScoreCounter value={p.score} durationMs={500} />
                </span>
                <ProgressBar value={progress} max={100} className="w-24" barClassName="bg-primary" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}
