'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
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
}

export function AnswerResult({
  isCorrect,
  pointsEarned,
  maxPoints,
  timeTakenMs,
  correctAnswers,
  yourAnswers,
  status,
}: AnswerResultProps) {
  if (status === 'timeout') {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="p-6 text-center border-amber-300 bg-amber-50">
          <Clock className="w-12 h-12 mx-auto text-amber-600" />
          <h3 className="text-xl font-semibold mt-2">Temps écoulé !</h3>
          <p className="text-neutral-600">Vous n'avez pas répondu à temps.</p>
          <p className="text-sm text-neutral-500 mt-2">0 point</p>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'p-6 text-center border-2',
          isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
        )}
      >
        <div className="flex justify-center">
          {isCorrect ? (
            <CheckCircle className="w-12 h-12 text-green-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold mt-2">
          {isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}
        </h3>
        <p className="text-sm text-neutral-600 mt-1">
          Réponse en {(timeTakenMs / 1000).toFixed(1)} secondes
        </p>
        <p className="text-lg font-bold mt-2">
          {isCorrect ? `+${pointsEarned} pts` : '0 pt'}
        </p>
        <p className="text-xs text-neutral-500">
          (max: {maxPoints} pts)
        </p>
        <div className="mt-4 text-sm text-neutral-700">
          <p>Votre réponse : {yourAnswers.join(', ') || '—'}</p>
          <p className="text-green-700">Réponse(s) attendue(s) : {correctAnswers.join(', ')}</p>
        </div>
      </Card>
    </motion.div>
  );
}