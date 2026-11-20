'use client';

import { Button } from '../ui/Button';
import Link from 'next/link';
import { Play, Pause, Square, SkipForward, Trophy, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
// --- Résultats de la question (#5) ---
import { AnswerHistogram, histogramOptions } from '../ui/AnswerHistogram';
import type { QuestionType, QuizOption, WsQuestionStatsPayload } from '@/types';
import { QuestionImage } from '../ui/QuestionImage';

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
  // --- Résultats de la question (#5) ---
  /** Statistiques de la question clôturée : affiche l'étape « résultats » entre la question et le classement. */
  questionResults?: {
    stats: WsQuestionStatsPayload;
    options?: QuizOption[];
    /** Type de la question (backend #7) : histogramme adapté (sondage sans réussite, ordre…). */
    questionType?: QuestionType | null;
    questionText?: string;
    imageUrl?: string | null;
  } | null;
  /** Passe de l'étape « résultats » au classement. */
  onShowLeaderboard?: () => void;
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
  questionResults = null,
  onShowLeaderboard,
}: SessionControlProps) {
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';
  const isWaiting = status === 'waiting';

  const hasMoreQuestions = currentQuestion < totalQuestions - 1;
  // --- Résultats de la question (#5) ---
  const showResults = isActive && Boolean(questionResults);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {isWaiting && (
        <Button onClick={onStartQuestion} disabled={isStarting}>
          <Play className="w-4 h-4 mr-2" />
          Lancer la 1ère question
        </Button>
      )}

      {/* --- Résultats de la question (#5) --- */}
      {showResults && questionResults && (
        <section aria-label="Résultats de la question" className="w-full space-y-4" data-testid="question-results">
          <h3 className="font-semibold">Résultats de la question {currentQuestion + 1}</h3>
          {questionResults.imageUrl && (
            <QuestionImage
              src={questionResults.imageUrl}
              questionText={questionResults.questionText}
              className="mx-0 max-h-40"
            />
          )}
          <AnswerHistogram
            options={histogramOptions(questionResults.options, questionResults.stats)}
            stats={questionResults.stats}
            questionType={questionResults.questionType}
          />
          <div className="flex flex-wrap items-center gap-3">
            {onShowLeaderboard && (
              <Button variant="secondary" onClick={onShowLeaderboard}>
                <Trophy className="w-4 h-4 mr-2" />
                Afficher le classement
              </Button>
            )}
            {hasMoreQuestions ? (
              <Button onClick={onStartQuestion} disabled={isStarting}>
                <SkipForward className="w-4 h-4 mr-2" />
                Question suivante
              </Button>
            ) : (
              <Button variant="success" onClick={onEnd}>
                <Square className="w-4 h-4 mr-2" />
                Terminer le quiz
              </Button>
            )}
          </div>
        </section>
      )}
      {/* --- fin résultats de la question --- */}

      {isActive && !showResults && (
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