'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Download,
  FileQuestion,
  Percent,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useSessionResults } from '@/hooks/useSessionResults';
import {
  formatPercent,
  formatSeconds,
  hardestQuestions,
  hasGradedQuestions,
  isGradedQuestion,
} from '@/lib/sessionResults';
import type { SessionResultsQuestion } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CircularStat } from '@/components/ui/CircularStat';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { ParticipantResultsTable } from '@/components/creator/ParticipantResultsTable';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
}

/** Histogramme horizontal de la distribution des réponses ; les bonnes réponses sont en vert. */
function AnswerHistogram({ question }: { question: SessionResultsQuestion }) {
  const t = useTranslations('report');
  const entries = Object.entries(question.answerDistribution);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-label={t('distributionAria')}>
      {entries.map(([optionId, count]) => {
        const correct = question.correctAnswers.includes(optionId);
        return (
          <div key={optionId} className="flex items-center gap-2 text-small">
            <span className="w-6 shrink-0 font-display tabular-nums font-semibold text-ink">{optionId}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className={cn('h-full rounded-full', correct ? 'bg-success-solid' : 'bg-ink-tertiary/40')}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-ink-secondary">
              {t('students', { count })}
              {correct && <span className="sr-only">{t('correctSr')}</span>}
            </span>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-caption text-ink-secondary">{t('noAnswers')}</p>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6" data-testid="report-loading" aria-busy="true">
      <Skeleton className="h-8 w-1/2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

function BackLink() {
  const t = useTranslations('report');
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/creator/dashboard">
        <ArrowLeft className="w-4 h-4" />
        {t('backToDashboard')}
      </Link>
    </Button>
  );
}

/** Rapport post-session : précision de la classe, questions à retravailler, tableau élèves, export CSV. */
export function SessionReport({ sessionId }: { sessionId: string }) {
  const t = useTranslations('report');
  const locale = useLocale();
  const { results, isLoading, error, refetch, exportCsv, isExporting, exportError } =
    useSessionResults(sessionId);

  if (isLoading) return <ReportSkeleton />;

  if (error === 'not_found') {
    return (
      <EmptyState
        icon={<FileQuestion className="w-8 h-8" />}
        title={t('notFoundTitle')}
        description={t('notFoundText')}
        action={<BackLink />}
        className="bg-surface rounded-lg border border-borderc"
      />
    );
  }

  if (error || !results) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-8 h-8" />}
        title={t('errorTitle')}
        description={t('errorText')}
        action={
          <Button size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
            {t('retry')}
          </Button>
        }
        className="bg-surface rounded-lg border border-borderc"
      />
    );
  }

  const { session, summary, perQuestion, perParticipant } = results;
  const graded = hasGradedQuestions(results);
  const toReview = hardestQuestions(perQuestion, 3);
  const startedAt = formatDate(session.startedAt, locale);
  const isEmpty = session.participantCount === 0 || perParticipant.length === 0;

  return (
    <div className="space-y-10">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href={`/creator/session/${sessionId}`}>
              <ArrowLeft className="w-4 h-4" />
              {t('backToSession')}
            </Link>
          </Button>
          <p className="text-small font-medium text-ink-secondary flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            {t('eyebrow')}
          </p>
          <h1 className="text-h2 sm:text-h1 leading-tight text-ink">
            {session.quizTitle || t('untitled')}
          </h1>
          <p className="text-small text-ink-secondary">
            {startedAt ? t('sessionOf', { date: startedAt }) : t('notStarted')}
            {session.status !== 'finished' && t('partial')}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button onClick={exportCsv} isLoading={isExporting} disabled={isEmpty || isExporting}>
            {!isExporting && <Download className="w-4 h-4" aria-hidden="true" />}
            {t('exportCsv')}
          </Button>
          {exportError && (
            <p role="alert" className="text-small text-danger">
              {t(`exportErrors.${exportError}`)}
            </p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={t('noParticipantsTitle')}
          description={t('noParticipantsText')}
          action={<BackLink />}
          className="bg-surface rounded-lg border border-borderc"
        />
      ) : (
        <>
          {/* Synthèse */}
          <section aria-labelledby="summary-title" className="space-y-4">
            <h2 id="summary-title" className="sr-only">
              {t('summary')}
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto,1fr] md:items-center">
              <Card className="p-6 flex justify-center">
                {graded ? (
                  <CircularStat
                    percentage={summary.accuracy * 100}
                    label={t('classAccuracy')}
                    sublabel={t('classAccuracyHint')}
                  />
                ) : (
                  <div className="max-w-[14rem] text-center space-y-1">
                    <Target className="w-8 h-8 mx-auto text-ink-secondary" aria-hidden="true" />
                    <p className="text-small font-semibold text-ink">{t('noAccuracy')}</p>
                    <p className="text-caption text-ink-secondary">
                      {t('pollsOnly')}
                    </p>
                  </div>
                )}
              </Card>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  value={session.participantCount}
                  label={t('participants')}
                  tone="primary"
                />
                <StatCard
                  icon={<Trophy className="w-5 h-5" />}
                  value={Math.round(summary.avgScore)}
                  label={t('avgScore')}
                  tone="primary"
                  delay={0.05}
                />
                <StatCard
                  icon={<Percent className="w-5 h-5" />}
                  value={Math.round(summary.completionRate * 100)}
                  label={t('completion')}
                  tone="primary"
                  delay={0.1}
                />
              </div>
            </div>
          </section>

          {/* À retravailler */}
          {toReview.length > 0 && (
            <section aria-labelledby="review-title" className="space-y-4">
              <div>
                <h2 id="review-title" className="text-h3 text-ink">
                  {t('toReview')}
                </h2>
                <p className="text-small text-ink-secondary">
                  {t('toReviewHint')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {toReview.map((q) => (
                  <Card key={q.questionId} className="p-5 space-y-4" data-testid="review-question">
                    <div className="space-y-1">
                      <p className="text-caption font-medium text-ink-secondary">
                        {t('question', { number: q.orderIndex + 1 })}
                      </p>
                      <h3 className="text-card-title text-ink">{q.text}</h3>
                      <p className="text-small text-ink-secondary">
                        {t.rich('successAvg', {
                          percent: formatPercent(q.accuracy, locale),
                          time: formatSeconds(q.avgTimeMs, locale),
                          b: (chunks) => <strong className="text-danger tabular-nums">{chunks}</strong>,
                        })}
                      </p>
                    </div>
                    <AnswerHistogram question={q} />
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Élèves */}
          <section aria-labelledby="students-title" className="space-y-4">
            <h2 id="students-title" className="text-h3 text-ink">
              {t('studentsTitle')}
            </h2>
            <ParticipantResultsTable participants={perParticipant} showAccuracy={graded} />
          </section>

          {/* Détail par question */}
          <section aria-labelledby="questions-title" className="space-y-4">
            <h2 id="questions-title" className="text-h3 text-ink">
              {t('perQuestion')}
            </h2>
            <ul className="divide-y divide-borderc rounded-lg border border-borderc bg-surface">
              {perQuestion.map((q) => (
                <li
                  key={q.questionId}
                  data-testid="question-row"
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-small text-ink">
                    <span className="font-medium text-ink-secondary">{t('questionShort', { number: q.orderIndex + 1 })}</span>{' '}
                    {q.text}
                  </span>
                  <span className="text-small tabular-nums text-ink-secondary shrink-0">
                    {isGradedQuestion(q) ? (
                      <>
                        {t.rich('success', {
                          percent: formatPercent(q.accuracy, locale),
                          b: (chunks) => <strong className="text-ink">{chunks}</strong>,
                        })}
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-sm border border-borderc px-1.5 py-0.5 text-caption">
                        {t('poll')}
                      </span>
                    )}
                    {' · '}
                    {formatSeconds(q.avgTimeMs, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
