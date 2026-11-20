'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Participant } from '@/types';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';
import { ScoreCounter } from '../ui/ScoreCounter';
import { Button } from '../ui/Button';
import { Users, CheckCircle, Clock, UserX, UserMinus } from 'lucide-react';

interface ParticipantListProps {
  participants: Participant[];
  progressMap?: Record<string, number>; // participantId -> answered count
  /** Live score-by-participant map (e.g. from the real-time leaderboard) that overrides participant.score. */
  liveScores?: Record<string, number>;
  /**
   * Exclusion d'un participant, appelée après confirmation. Sans cette prop, le bouton
   * « Exclure » n'est pas affiché.
   */
  onKick?: (participant: Participant) => void;
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

export function ParticipantList({ participants, progressMap = {}, liveScores = {}, onKick }: ParticipantListProps) {
  const shouldReduceMotion = useReducedMotion();
  // Participant dont l'exclusion attend une confirmation.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Le score en direct (issu du classement temps réel) prime toujours sur la valeur
  // potentiellement obsolète stockée sur le participant.
  const withLiveScore = participants.map((p) => ({
    ...p,
    score: liveScores[p.id] ?? p.score,
  }));
  const sorted = [...withLiveScore].sort((a, b) => b.score - a.score);
  const confirming = participants.find((p) => p.id === confirmingId) ?? null;

  // Focus sur « Annuler » à l'ouverture : l'action destructive demande un geste explicite.
  useEffect(() => {
    if (confirmingId) cancelRef.current?.focus();
  }, [confirmingId]);

  // Participant parti entre-temps : on referme la confirmation.
  useEffect(() => {
    if (confirmingId && !confirming) setConfirmingId(null);
  }, [confirmingId, confirming]);

  const handleConfirm = () => {
    if (confirming && onKick) onKick(confirming);
    setConfirmingId(null);
  };

  const handleConfirmKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setConfirmingId(null);
    }
  };

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
            const isConfirming = confirmingId === p.id;
            return (
              <motion.div
                key={p.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 text-small">
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
                  {onKick && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(p.id)}
                      aria-label={`Exclure ${p.pseudo}`}
                      aria-expanded={isConfirming}
                      title="Exclure de la partie"
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-secondary hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      <UserMinus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {isConfirming && (
                  <div
                    role="alertdialog"
                    aria-labelledby={`kick-confirm-${p.id}`}
                    onKeyDown={handleConfirmKeyDown}
                    className="rounded-md border border-danger/30 bg-danger/5 p-3 space-y-2"
                  >
                    <p id={`kick-confirm-${p.id}`} className="text-small">
                      Exclure <strong>{p.pseudo}</strong> de la partie ? Ce pseudo ne pourra plus
                      rejoindre la session.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button ref={cancelRef} type="button" variant="outline" size="sm" onClick={() => setConfirmingId(null)}>
                        Annuler
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={handleConfirm}>
                        Exclure
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}
