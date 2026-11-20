'use client';

import { CheckCircle2, Lightbulb, XCircle, MinusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnswerResult } from '../ui/AnswerResult';
import { Card } from '../ui/Card';
import { cn } from '@/lib/utils';
import type { QuizOption, WsQuestionRevealPayload } from '@/types';

interface AnswerFeedbackProps {
  /** Résultat immédiat de la réponse (`answer:result`). Absent si le joueur n'a pas répondu. */
  result?: {
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    timeTakenMs: number;
    correctAnswers: string[];
    yourAnswers: string[];
    status: 'answered' | 'timeout' | 'skipped';
  } | null;
  /** Correction envoyée à la clôture de la question (`question:reveal`). */
  reveal?: WsQuestionRevealPayload | null;
  /** Options de la question, pour rappeler le texte des réponses. */
  options?: QuizOption[];
}

function describe(ids: string[], options: QuizOption[] | undefined) {
  if (ids.length === 0) return '—';
  return ids
    .map((id) => {
      const text = options?.find((o) => o.id === id)?.text;
      return text ? `${id}. ${text}` : id;
    })
    .join(', ');
}

export function AnswerFeedback({ result, reveal, options }: AnswerFeedbackProps) {
  const t = useTranslations('player.feedback');
  const answered = reveal ? reveal.yourAnswers.length > 0 : true;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {result && (
        <AnswerResult
          {...result}
          // La correction (si reçue) fait foi ; on évite d'afficher le rappel en double.
          isCorrect={reveal ? reveal.isCorrect : result.isCorrect}
          showRecap={!reveal}
        />
      )}

      {reveal && (
        <Card
          tier="primary"
          className="p-5 space-y-3"
          role="region"
          aria-labelledby="reveal-title"
          aria-live="polite"
          data-testid="answer-reveal"
        >
          <h3
            id="reveal-title"
            className={cn(
              'flex items-center gap-2 text-h3',
              !answered ? 'text-ink-secondary' : reveal.isCorrect ? 'text-success' : 'text-danger'
            )}
          >
            {!answered ? (
              <MinusCircle className="w-6 h-6" aria-hidden />
            ) : reveal.isCorrect ? (
              <CheckCircle2 className="w-6 h-6" aria-hidden />
            ) : (
              <XCircle className="w-6 h-6" aria-hidden />
            )}
            {!answered ? t('noAnswer') : reveal.isCorrect ? t('correct') : t('wrong')}
          </h3>

          <dl className="text-small space-y-1">
            <div className="flex gap-2">
              <dt className="text-ink-secondary">{t('yourAnswer')}</dt>
              <dd className="font-medium text-ink">{describe(reveal.yourAnswers, options)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-secondary">
                {t('correctAnswers', { count: reveal.correctAnswers.length })}
              </dt>
              <dd className="font-medium text-success">{describe(reveal.correctAnswers, options)}</dd>
            </div>
          </dl>

          {reveal.explanation && (
            <div className="rounded-md bg-primary-50 p-3 text-small" data-testid="answer-explanation">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <Lightbulb className="w-4 h-4" aria-hidden />
                {t('explanation')}
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{reveal.explanation}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
