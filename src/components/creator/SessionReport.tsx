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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

/** Histogramme horizontal de la distribution des réponses ; les bonnes réponses sont en vert. */
function AnswerHistogram({ question }: { question: SessionResultsQuestion }) {
  const entries = Object.entries(question.answerDistribution);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-label="Distribution des réponses">
      {entries.map(([optionId, count]) => {
        const correct = question.correctAnswers.includes(optionId);
        return (
          <div key={optionId} className="flex items-center gap-2 text-small">
            <span className="w-6 shrink-0 font-display tabular-nums font-semibold text-ink">{optionId}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className={cn('h-full rounded-full', correct ? 'bg-success' : 'bg-ink-secondary/40')}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-ink-secondary">
              {count} {count > 1 ? 'élèves' : 'élève'}
              {correct && <span className="sr-only"> (bonne réponse)</span>}
            </span>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-caption text-ink-secondary">Aucune réponse donnée à cette question.</p>
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

const backLink = (
  <Button variant="outline" size="sm" asChild>
    <Link href="/creator/dashboard">
      <ArrowLeft className="w-4 h-4 mr-1" />
      Retour au tableau de bord
    </Link>
  </Button>
);

/** Rapport post-session : précision de la classe, questions à retravailler, tableau élèves, export CSV. */
export function SessionReport({ sessionId }: { sessionId: string }) {
  const { results, isLoading, error, refetch, exportCsv, isExporting, exportError } =
    useSessionResults(sessionId);

  if (isLoading) return <ReportSkeleton />;

  if (error === 'not_found') {
    return (
      <EmptyState
        icon={<FileQuestion className="w-8 h-8" />}
        title="Rapport introuvable"
        description="Cette session n'existe pas, a été supprimée, ou vous n'en êtes pas le créateur."
        action={backLink}
        className="bg-surface rounded-lg border border-borderc"
      />
    );
  }

  if (error || !results) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-8 h-8" />}
        title="Impossible de charger le rapport"
        description="Une erreur est survenue. Vérifiez votre connexion puis réessayez."
        action={
          <Button size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Réessayer
          </Button>
        }
        className="bg-surface rounded-lg border border-borderc"
      />
    );
  }

  const { session, summary, perQuestion, perParticipant } = results;
  const graded = hasGradedQuestions(results);
  const toReview = hardestQuestions(perQuestion, 3);
  const startedAt = formatDate(session.startedAt);
  const isEmpty = session.participantCount === 0 || perParticipant.length === 0;

  return (
    <div className="space-y-10">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href={`/creator/session/${sessionId}`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour à la session
            </Link>
          </Button>
          <p className="text-small font-medium text-ink-secondary flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Rapport de session
          </p>
          <h1 className="text-h2 sm:text-h1 leading-tight text-ink">
            {session.quizTitle || 'Quiz sans titre'}
          </h1>
          <p className="text-small text-ink-secondary">
            {startedAt ? `Session du ${startedAt}` : 'Session non démarrée'}
            {session.status !== 'finished' && ' · en cours (résultats partiels)'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button onClick={exportCsv} isLoading={isExporting} disabled={isEmpty || isExporting}>
            {!isExporting && <Download className="w-4 h-4 mr-2" aria-hidden="true" />}
            Exporter CSV
          </Button>
          {exportError && (
            <p role="alert" className="text-small text-danger">
              {exportError}
            </p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Aucun participant"
          description="Personne n'a rejoint cette session : il n'y a pas encore de résultats à analyser."
          action={backLink}
          className="bg-surface rounded-lg border border-borderc"
        />
      ) : (
        <>
          {/* Synthèse */}
          <section aria-labelledby="summary-title" className="space-y-4">
            <h2 id="summary-title" className="sr-only">
              Synthèse
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto,1fr] md:items-center">
              <Card className="p-6 flex justify-center">
                {graded ? (
                  <CircularStat
                    percentage={summary.accuracy * 100}
                    label="Précision de la classe"
                    sublabel="Bonnes réponses, sans-réponse comptées fausses"
                  />
                ) : (
                  <div className="max-w-[14rem] text-center space-y-1">
                    <Target className="w-8 h-8 mx-auto text-ink-secondary" aria-hidden="true" />
                    <p className="text-small font-semibold text-ink">Pas de précision</p>
                    <p className="text-caption text-ink-secondary">
                      Ce quiz ne contient que des sondages, sans bonne réponse.
                    </p>
                  </div>
                )}
              </Card>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  value={session.participantCount}
                  label="Participants"
                  tone="primary"
                />
                <StatCard
                  icon={<Trophy className="w-5 h-5" />}
                  value={Math.round(summary.avgScore)}
                  label="Score moyen"
                  tone="accent"
                  delay={0.05}
                />
                <StatCard
                  icon={<Percent className="w-5 h-5" />}
                  value={Math.round(summary.completionRate * 100)}
                  label="Taux de réponse (%)"
                  tone="success"
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
                  À retravailler
                </h2>
                <p className="text-small text-ink-secondary">
                  Les questions notées les moins réussies, avec la répartition des réponses.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {toReview.map((q) => (
                  <Card key={q.questionId} className="p-5 space-y-4" data-testid="review-question">
                    <div className="space-y-1">
                      <p className="text-caption font-medium text-ink-secondary">
                        Question {q.orderIndex + 1}
                      </p>
                      <h3 className="text-card-title text-ink">{q.text}</h3>
                      <p className="text-small text-ink-secondary">
                        <strong className="text-danger tabular-nums">{formatPercent(q.accuracy)}</strong>{' '}
                        de réussite · {formatSeconds(q.avgTimeMs)} en moyenne
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
              Élèves
            </h2>
            <ParticipantResultsTable participants={perParticipant} showAccuracy={graded} />
          </section>

          {/* Détail par question */}
          <section aria-labelledby="questions-title" className="space-y-4">
            <h2 id="questions-title" className="text-h3 text-ink">
              Détail par question
            </h2>
            <ul className="divide-y divide-borderc rounded-lg border border-borderc bg-surface">
              {perQuestion.map((q) => (
                <li
                  key={q.questionId}
                  data-testid="question-row"
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-small text-ink">
                    <span className="font-medium text-ink-secondary">Q{q.orderIndex + 1}.</span>{' '}
                    {q.text}
                  </span>
                  <span className="text-small tabular-nums text-ink-secondary shrink-0">
                    {isGradedQuestion(q) ? (
                      <>
                        <strong className="text-ink">{formatPercent(q.accuracy)}</strong> de réussite
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-borderc px-2 py-0.5 text-caption">
                        Sondage · non noté
                      </span>
                    )}
                    {' · '}
                    {formatSeconds(q.avgTimeMs)}
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
