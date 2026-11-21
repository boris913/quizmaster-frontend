'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { answerTone } from '@/lib/answerTone';
import { useAnswerLabels } from '@/i18n/answerLabel';
import {
  accuracyToPercent,
  inferQuestionType,
  normalizeShortAnswer,
  type QuestionType,
  type QuizOption,
  type WsQuestionStatsPayload,
} from '@/types';

export interface AnswerHistogramProps {
  /** Options de la question, dans l'ordre d'affichage. */
  options: QuizOption[];
  stats: Pick<
    WsQuestionStatsPayload,
    'distribution' | 'correctAnswers' | 'accuracy' | 'answeredCount' | 'totalParticipants'
  > &
    Partial<Pick<WsQuestionStatsPayload, 'type' | 'graded'>>;
  /** `projection` : grandes tailles (vidéoprojecteur). Les couleurs viennent du thème du conteneur. */
  variant?: 'default' | 'projection';
  className?: string;
  /**
   * Type de la question (backend #7). Sondage : ni bonne réponse ni pourcentage de réussite.
   * Remise en ordre : ordre attendu au lieu d'une barre par option. Réponse courte : réponses
   * acceptées et réponses les plus fréquentes. Absent : déduit si possible (correction vide = sondage).
   */
  questionType?: QuestionType | string | null;
}

/** Part (en %) des répondants ayant choisi l'option. En choix multiple, le total peut dépasser 100 %. */
function percentOf(count: number, answered: number) {
  return answered > 0 ? Math.round((count / answered) * 100) : 0;
}

/**
 * Histogramme des réponses à une question clôturée : une barre par option, bonne(s) réponse(s)
 * mise(s) en évidence, pourcentages. Ne reçoit que des agrégats : jamais de pseudo.
 *
 * Accessibilité : chaque barre est décorative ; la valeur est donnée en texte (nombre et %),
 * et la bonne réponse est signalée par un libellé, pas seulement par la couleur.
 */
export function AnswerHistogram({
  options,
  stats,
  variant = 'default',
  className,
  questionType,
}: AnswerHistogramProps) {
  const t = useTranslations('histogram');
  const { answerLabel, optionText } = useAnswerLabels();
  const isProjection = variant === 'projection';
  // Type : prop, sinon celui de `question:stats` (backend #7), sinon déduit (correction vide = sondage).
  const type =
    stats.graded === false
      ? 'poll'
      : inferQuestionType({
          type: questionType ?? stats.type ?? undefined,
          correctAnswers: stats.correctAnswers ?? [],
        }) ?? 'single';
  const isPoll = type === 'poll';
  const distribution = stats.distribution ?? {};
  const correct = new Set(isPoll ? [] : stats.correctAnswers ?? []);
  const answered = Math.max(0, stats.answeredCount ?? 0);
  const total = Math.max(answered, stats.totalParticipants ?? 0);
  const accuracy = accuracyToPercent(stats.accuracy);
  const summary =
    answered === 0
      ? t('none', { total })
      : isPoll
        ? t('pollSummary', { answered, total })
        : t('summary', { answered, total, accuracy });
  const textSize = isProjection ? 'text-[clamp(1.25rem,2.4vw,2.75rem)] font-semibold' : 'text-small';
  const caption = (
    <figcaption
      className={cn('mb-3', isProjection ? 'text-[clamp(1.25rem,2vw,2.25rem)] text-ink-secondary' : 'text-small text-ink-secondary')}
      data-testid="histogram-summary"
    >
      {summary}
    </figcaption>
  );

  // Remettre dans l'ordre : une barre par option n'a pas de sens (chacun place toutes les
  // options). On montre l'ordre attendu ; la réussite est dans le résumé.
  if (type === 'ordering') {
    const ids = stats.correctAnswers?.length ? stats.correctAnswers : options.map((o) => o.id);
    return (
      <figure className={cn('w-full', className)} aria-label={t('resultsAria')} data-testid="answer-histogram">
        {caption}
        <p className={cn('mb-2 font-medium', textSize)}>{t('expectedOrder')}</p>
        <ol className="space-y-2" data-testid="histogram-ordering">
          {ids.map((id, i) => (
            <li
              key={id}
              className={cn('flex items-center gap-3 rounded-md px-3 py-2', textSize, isProjection ? 'bg-ink/10' : 'bg-success-50')}
            >
              <span className="font-display tabular-nums opacity-80">{i + 1}.</span>
              <span className="min-w-0 break-words">{answerLabel(id, options)}</span>
            </li>
          ))}
        </ol>
      </figure>
    );
  }

  // Réponse courte : réponses acceptées, puis réponses les plus fréquentes si le serveur les agrège.
  if (type === 'short_answer') {
    const acceptedList = stats.correctAnswers ?? [];
    const accepted = new Set(acceptedList.map(normalizeShortAnswer));
    const top = Object.entries(distribution)
      .filter(([, n]) => Number(n) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);
    return (
      <figure className={cn('w-full', className)} aria-label={t('resultsAria')} data-testid="answer-histogram">
        {caption}
        <p className={cn('mb-3', textSize)} data-testid="histogram-accepted">
          {t('accepted', { count: acceptedList.length })}{' '}
          <strong>{acceptedList.join(' / ') || '—'}</strong>
        </p>
        {top.length > 0 && (
          <ul className={cn('space-y-2', isProjection && 'space-y-[2vh]')} aria-label={t('topAnswers')}>
            {top.map(([answer, n]) => {
              const count = Math.max(0, Number(n) || 0);
              const pct = percentOf(count, answered);
              const ok = accepted.has(normalizeShortAnswer(answer));
              return (
                <li key={answer} data-testid="histogram-short-row" data-correct={ok || undefined}>
                  <div className={cn('flex items-baseline justify-between gap-3', textSize)}>
                    <span className="min-w-0 break-words">
                      {t('quoted', { answer })}
                      {ok && <span className="sr-only">{t('acceptedSr')}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-semibold">{t('percent', { value: pct })}</span> {t('count', { count })}
                    </span>
                  </div>
                  <div
                    aria-hidden
                    className={cn(
                      'mt-1 w-full overflow-hidden rounded-full',
                      isProjection ? 'h-[clamp(1rem,2.5vh,2rem)] bg-ink/10' : 'h-3 bg-ink/[0.06]'
                    )}
                  >
                    <div
                      className={cn('h-full rounded-full', ok ? 'bg-success-solid' : 'bg-ink-tertiary/40')}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </figure>
    );
  }

  return (
    <figure
      className={cn('w-full', className)}
      aria-label={t('aria')}
      data-testid="answer-histogram"
    >
      {caption}

      <ul className={cn('space-y-2', isProjection && 'space-y-[2vh]')}>
        {options.map((opt, index) => {
          const count = Math.max(0, Number(distribution[opt.id] ?? 0) || 0);
          const pct = percentOf(count, answered);
          const isCorrect = correct.has(opt.id);
          return (
            <li key={opt.id} data-testid={`histogram-row-${opt.id}`} data-correct={isCorrect || undefined}>
              <div
                className={cn(
                  'flex items-baseline justify-between gap-3',
                  isProjection ? 'text-[clamp(1.25rem,2.4vw,2.75rem)] font-semibold' : 'text-small'
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {type !== 'true_false' && (
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center justify-center rounded-sm font-display font-bold text-white',
                        isProjection ? 'h-[1.4em] w-[1.4em]' : 'h-5 w-5 text-caption',
                        answerTone(opt.id, index).bg
                      )}
                    >
                      {opt.id}
                    </span>
                  )}
                  <span className="min-w-0 break-words">{opt.text ? optionText(opt.text) : answerLabel(opt.id, options)}</span>
                  {isCorrect && (
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                        isProjection ? 'bg-success-solid text-white text-[0.6em]' : 'bg-success-50 text-success text-caption'
                      )}
                    >
                      <Check className="h-[1em] w-[1em]" aria-hidden />
                      {t('correct')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{t('percent', { value: pct })}</span>{' '}
                  <span className={isProjection ? 'text-ink-tertiary' : 'text-ink-secondary'}>
                    {t('count', { count })}
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                className={cn(
                  'mt-1 w-full overflow-hidden rounded-full',
                  isProjection ? 'h-[clamp(1rem,2.5vh,2rem)] bg-ink/10' : 'h-3 bg-ink/[0.06]'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500 ease-out',
                    isCorrect ? 'bg-success-solid' : isPoll ? 'bg-primary' : 'bg-ink-tertiary/40'
                  )}
                  style={{ width: `${Math.min(100, pct)}%` }}
                  data-testid={`histogram-bar-${opt.id}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/**
 * Options à afficher : celles de la question si on les connaît, sinon déduites de la
 * distribution et des bonnes réponses (ex. page rechargée pendant la clôture).
 */
export function histogramOptions(
  options: QuizOption[] | null | undefined,
  stats: Pick<WsQuestionStatsPayload, 'distribution' | 'correctAnswers'>
): QuizOption[] {
  if (options && options.length > 0) return options;
  const ids = new Set([...Object.keys(stats.distribution ?? {}), ...(stats.correctAnswers ?? [])]);
  return Array.from(ids)
    .sort()
    .map((id) => ({ id, text: '' }));
}
