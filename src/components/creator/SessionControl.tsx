'use client';

import { Button } from '../ui/Button';
import Link from 'next/link';
import { Play, Pause, Square, SkipForward, BarChart3 } from 'lucide-react';
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
  /** Lien vers le rapport post-session, affiché une fois le quiz terminé. */
  reportHref?: string;
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
  reportHref,
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
        <>
          <span className="text-sm text-ink-secondary">Quiz terminé</span>
          {reportHref && (
            <Button asChild>
              <Link href={reportHref}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Voir le rapport
              </Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}