'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

interface AnswerResultProps {
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  timeTakenMs: number;
  correctAnswers: string[];
  yourAnswers: string[];
  status: 'answered' | 'timeout' | 'skipped';
  /** Affiche le rappel « Votre réponse / Réponse attendue » (masqué quand la correction est affichée ailleurs). */
  showRecap?: boolean;
}

export function AnswerResult({
  isCorrect,
  pointsEarned,
  maxPoints,
  timeTakenMs,
  correctAnswers,
  yourAnswers,
  status,
  showRecap = true,
}: AnswerResultProps) {
  const shouldReduceMotion = useReducedMotion();
  const pop = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { scale: 0.85, opacity: 0 }, animate: { scale: 1, opacity: 1 } };

  if (status === 'timeout') {
    return (
      <motion.div {...pop} transition={{ duration: 0.3, ease: 'easeOut' }}>
        <Card tier="primary" className="p-8 text-center border-warning/30 bg-warning-50">
          <Clock className="w-12 h-12 mx-auto text-warning" />
          <h3 className="text-h3 mt-3">Temps écoulé !</h3>
          <p className="text-ink-secondary mt-1">Vous n&apos;avez pas répondu à temps.</p>
          <p className="text-small text-ink-secondary mt-3">+0 pt</p>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...pop} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}>
      <Card
        tier="primary"
        className={cn(
          'p-8 text-center border-2',
          isCorrect ? 'border-success/40 bg-success-50' : 'border-danger/40 bg-danger-50'
        )}
      >
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 15 }}
          className="flex justify-center"
        >
          {isCorrect ? (
            <CheckCircle2 className="w-14 h-14 text-success" strokeWidth={1.75} />
          ) : (
            <XCircle className="w-14 h-14 text-danger" strokeWidth={1.75} />
          )}
        </motion.div>

        <h3 className="text-h3 mt-3">
          {isCorrect ? 'Bonne réponse !' : 'Continuez comme ça 💪'}
        </h3>
        <p className="text-small text-ink-secondary mt-1">
          Répondu en {(timeTakenMs / 1000).toFixed(1)}s
        </p>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-h1 font-bold mt-3',
            isCorrect ? 'text-success' : 'text-ink-secondary'
          )}
        >
          {isCorrect ? `+${pointsEarned}` : '+0'}
          <span className="text-h3 font-medium ml-1">pts</span>
        </motion.p>
        <p className="text-caption text-ink-secondary/80">sur {maxPoints} pts max</p>

        {showRecap && !isCorrect && correctAnswers.length > 0 && (
          <div className="mt-5 text-small text-left bg-white/60 rounded-md p-3 space-y-1">
            <p className="text-ink-secondary">
              Votre réponse : <span className="font-medium text-ink">{yourAnswers.join(', ') || '—'}</span>
            </p>
            <p className="text-success">
              Réponse attendue : <span className="font-medium">{correctAnswers.join(', ')}</span>
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
