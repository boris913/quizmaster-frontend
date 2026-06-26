'use client';

import { Button } from '../ui/Button';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionControlProps {
  status: 'waiting' | 'active' | 'paused' | 'finished';
  currentQuestion: number;
  totalQuestions: number;
  onStartQuestion: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  isStarting?: boolean;
  className?: string;
}

export function SessionControl({
  status,
  currentQuestion,
  totalQuestions,
  onStartQuestion,
  onPause,
  onResume,
  onEnd,
  isStarting = false,
  className,
}: SessionControlProps) {
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';
  const isWaiting = status === 'waiting';

  const hasMoreQuestions = currentQuestion < totalQuestions - 1;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {isWaiting && (
        <Button onClick={onStartQuestion} disabled={isStarting}>
          <Play className="w-4 h-4 mr-2" />
          Lancer la 1ère question
        </Button>
      )}

      {isActive && (
        <>
          <Button variant="secondary" onClick={onPause}>
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          {hasMoreQuestions ? (
            <Button variant="outline" onClick={onStartQuestion}>
              <SkipForward className="w-4 h-4 mr-2" />
              Question suivante
            </Button>
          ) : (
            <Button variant="success" onClick={onEnd}>
              <Square className="w-4 h-4 mr-2" />
              Terminer le quiz
            </Button>
          )}
        </>
      )}

      {isPaused && (
        <>
          <Button onClick={onResume}>
            <Play className="w-4 h-4 mr-2" />
            Reprendre
          </Button>
          <Button variant="danger" onClick={onEnd}>
            <Square className="w-4 h-4 mr-2" />
            Terminer
          </Button>
        </>
      )}

      {isFinished && (
        <span className="text-sm text-neutral-500">Quiz terminé</span>
      )}
    </div>
  );
}