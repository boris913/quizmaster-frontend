import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accuracyToPercent, type QuizOption, type WsQuestionStatsPayload } from '@/types';

export interface AnswerHistogramProps {
  /** Options de la question, dans l'ordre d'affichage. */
  options: QuizOption[];
  stats: Pick<
    WsQuestionStatsPayload,
    'distribution' | 'correctAnswers' | 'accuracy' | 'answeredCount' | 'totalParticipants'
  >;
  /** `projection` : grandes tailles, texte clair sur fond sombre (vidéoprojecteur). */
  variant?: 'default' | 'projection';
  className?: string;
}

/** Part (en %) des répondants ayant choisi l'option. En choix multiple, le total peut dépasser 100 %. */
function percentOf(count: number, answered: number) {
  return answered > 0 ? Math.round((count / answered) * 100) : 0;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

/**
 * Histogramme des réponses à une question clôturée : une barre par option, bonne(s) réponse(s)
 * mise(s) en évidence, pourcentages. Ne reçoit que des agrégats : jamais de pseudo.
 *
 * Accessibilité : chaque barre est décorative ; la valeur est donnée en texte (nombre et %),
 * et la bonne réponse est signalée par un libellé, pas seulement par la couleur.
 */
export function AnswerHistogram({ options, stats, variant = 'default', className }: AnswerHistogramProps) {
  const isProjection = variant === 'projection';
  const distribution = stats.distribution ?? {};
  const correct = new Set(stats.correctAnswers ?? []);
  const answered = Math.max(0, stats.answeredCount ?? 0);
  const total = Math.max(answered, stats.totalParticipants ?? 0);
  const accuracy = accuracyToPercent(stats.accuracy);
  const summary =
    answered === 0
      ? `Aucune réponse sur ${plural(total, 'participant')}`
      : `${plural(answered, 'réponse')} sur ${plural(total, 'participant')} · ${accuracy} % des participants ont répondu juste`;

  return (
    <figure
      className={cn('w-full', className)}
      aria-label="Répartition des réponses"
      data-testid="answer-histogram"
    >
      <figcaption
        className={cn(
          'mb-3',
          isProjection ? 'text-[clamp(1.25rem,2vw,2.25rem)] text-white/80' : 'text-small text-ink-secondary'
        )}
        data-testid="histogram-summary"
      >
        {summary}
      </figcaption>

      <ul className={cn('space-y-2', isProjection && 'space-y-[2vh]')}>
        {options.map((opt) => {
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
                  <span className="font-mono opacity-80">{opt.id}</span>
                  <span className="min-w-0 break-words">{opt.text}</span>
                  {isCorrect && (
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                        isProjection ? 'bg-success text-white text-[0.6em]' : 'bg-success-50 text-success text-caption'
                      )}
                    >
                      <Check className="h-[1em] w-[1em]" aria-hidden />
                      Bonne réponse
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{pct} %</span>{' '}
                  <span className={isProjection ? 'text-white/60' : 'text-ink-secondary'}>
                    ({plural(count, 'réponse')})
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                className={cn(
                  'mt-1 w-full overflow-hidden rounded-full',
                  isProjection ? 'h-[clamp(1rem,2.5vh,2rem)] bg-white/10' : 'h-3 bg-black/[0.06]'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500 ease-out',
                    isCorrect ? 'bg-success' : isProjection ? 'bg-white/40' : 'bg-ink-secondary/40'
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
