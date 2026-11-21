'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card } from '../ui/Card';
import { ScoreCounter } from '../ui/ScoreCounter';
import { cn } from '@/lib/utils';
import { RankBadge } from '../ui/RankBadge';

interface ScoreDisplayProps {
  score: number;
  /** Rang (>= 1). `null` / absent : aucun rang affiché (classement masqué ou inconnu). */
  rank?: number | null;
  totalParticipants?: number | null;
  gapToNext?: number | null;
  gapToPodium?: number | null;
  onPodium?: boolean;
  /**
   * Classement masqué aux élèves : ni rang, ni écarts, ni podium, même si des valeurs sont
   * fournies. La précision de la classe est affichée à la place quand elle est connue.
   */
  hideRanking?: boolean;
  /** Précision de la classe (0-100), affichée en mode sans classement. */
  classAccuracy?: number | null;
  /** Nombre de bonnes réponses du joueur, affiché en mode sans classement. */
  correctCount?: number | null;
}

function isRank(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

export function ScoreDisplay({
  score,
  rank,
  totalParticipants,
  gapToNext = null,
  gapToPodium = null,
  onPodium = false,
  hideRanking = false,
  classAccuracy = null,
  correctCount = null,
}: ScoreDisplayProps) {
  const t = useTranslations('player.score');
  const tc = useTranslations('common');
  const showRank = !hideRanking && isRank(rank);
  const showGapToNext = showRank && rank > 1 && typeof gapToNext === 'number';
  const showGapToPodium = showRank && rank > 3 && typeof gapToPodium === 'number';
  const showPodium = showRank && onPodium;
  const hasTotal = typeof totalParticipants === 'number' && totalParticipants > 0;

  return (
    <Card tier="secondary" className="p-6 space-y-4" data-testid="score-display">
      <div className="flex justify-between items-center">
        <span className="text-small text-ink-secondary font-medium">{t('yourScore')}</span>
        <span className="font-display text-h2 font-bold tabular-nums">
          <ScoreCounter value={score} /> <span className="text-small font-medium text-ink-secondary">{tc('points')}</span>
        </span>
      </div>

      {showRank && (
        <div className="flex items-center gap-2" data-testid="player-rank">
          <RankBadge rank={rank} />
          <span className="font-semibold">{t('place', { rank })}</span>
          {hasTotal && (
            <span className="text-small text-ink-secondary">{t('ofParticipants', { count: totalParticipants })}</span>
          )}
        </div>
      )}

      {!showRank && (typeof correctCount === 'number' || typeof classAccuracy === 'number') && (
        <div className="space-y-1.5 text-small" data-testid="class-accuracy">
          {typeof correctCount === 'number' && (
            <p className="text-ink-secondary">
              {t('yourCorrect')} <span className="font-semibold text-ink">{correctCount}</span>
            </p>
          )}
          {typeof classAccuracy === 'number' && (
            <p className="text-ink-secondary">
              {t('classLabel')} <span className="font-semibold text-ink">{t('classAccuracy', { value: classAccuracy })}</span>
            </p>
          )}
        </div>
      )}

      {showGapToNext || showGapToPodium || showPodium ? (
        <div className="space-y-1.5 text-small pt-1 border-t border-borderc">
          {showGapToNext && (
            <p className="text-ink-secondary pt-2">
              {t('gapToNext')} <span className="font-semibold text-ink">{tc('pointsCount', { count: gapToNext })}</span>
            </p>
          )}
          {showGapToPodium && (
            <p className="text-ink-secondary">
              {t('gapToPodium')} <span className="font-semibold text-ink">{tc('pointsCount', { count: gapToPodium })}</span>
            </p>
          )}
          {showPodium && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn('font-semibold text-success')}
            >
              {t('onPodium')}
            </motion.p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
