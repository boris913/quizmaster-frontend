'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuiz } from '@/hooks/useQuiz';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Copy, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NicknameMode } from '@/lib/nickname';
import type { ScoringMode } from '@/types';

const NICKNAME_MODES: NicknameMode[] = ['free', 'generated'];
const SCORING_MODES: ScoringMode[] = ['speed', 'accuracy'];

export default function NewSessionPage() {
  const t = useTranslations('newSession');
  const tc = useTranslations('common');
  const router = useRouter();

  const NICKNAME_MODE_OPTIONS = NICKNAME_MODES.map((value) => ({
    value,
    label: t(`nickname.${value}.label`),
    description: t(`nickname.${value}.desc`),
  }));
  const SCORING_MODE_OPTIONS = SCORING_MODES.map((value) => ({
    value,
    label: t(`scoring.${value}.label`),
    badge: value === 'accuracy' ? t('scoring.accuracy.badge') : undefined,
    description: t(`scoring.${value}.desc`),
  }));
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');
  const { currentQuiz, fetchQuiz, isLoading: quizLoading } = useQuiz();
  const { createSession, isLoading: sessionLoading } = useSession();
  const [created, setCreated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [nicknameMode, setNicknameMode] = useState<NicknameMode>('free');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('speed');
  const [hideLeaderboard, setHideLeaderboard] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, [quizId]);

  const handleCreate = async () => {
    if (!quizId) return;
    try {
      const s = await createSession(quizId, {
        nicknameMode,
        scoringMode,
        showLeaderboard: !hideLeaderboard,
      });
      setSession(s);
      setCreated(true);
    } catch (error) {
      console.error('Erreur création session:', error);
    }
  };

  const handleCopyPassword = () => {
    if (session?.password) {
      navigator.clipboard.writeText(session.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">{tc('loading')}</p>
      </div>
    );
  }

  if (!quizId || !currentQuiz) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <p className="text-ink-secondary">{t('notFound')}</p>
        <Button asChild className="mt-4">
          <Link href="/creator/dashboard">{t('backToDashboard')}</Link>
        </Button>
      </div>
    );
  }

  if (created && session) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" strokeWidth={1.5} aria-hidden />
          <h1 className="text-h2">{t('created')}</h1>
          <p className="text-ink-secondary">{t('shareCode')}</p>
          <div className="flex items-center justify-center gap-3 bg-ink/[0.05] rounded-lg p-4">
            <span className="font-display text-3xl font-bold tracking-[0.12em] tabular-nums">
              {session.password}
            </span>
            <button
              type="button"
              onClick={handleCopyPassword}
              aria-label={copied ? t('copied') : t('copy')}
              title={copied ? t('copied') : t('copy')}
              className="p-2 hover:bg-ink/[0.08] rounded transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5 text-ink-secondary" />
              )}
            </button>
          </div>
          <p className="text-small text-ink-secondary">
            {t('summary', { title: currentQuiz.title, count: currentQuiz.total_questions })}
          </p>
          <p className="text-small text-ink-secondary">
            {(session.nickname_mode ?? nicknameMode) === 'generated'
              ? t('nickname.generated.label')
              : t('nickname.free.label')}
          </p>
          <p className="text-small text-ink-secondary" data-testid="session-scoring-summary">
            {(session.scoring_mode ?? scoringMode) === 'accuracy' ? t('modeAccuracy') : t('modeSpeed')}
            {' • '}
            {(session.show_leaderboard ?? !hideLeaderboard) === false ? t('rankingHidden') : t('rankingVisible')}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/creator/session/${session.id}`)}>
              {t('openControl')}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/creator/dashboard">{t('backToDashboard')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/creator/dashboard" aria-label={t('backToDashboard')}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
          <h1 className="text-h3">{t('title')}</h1>
        </div>
        <div className="space-y-2">
          <p className="font-medium">{currentQuiz.title}</p>
          <p className="text-small text-ink-secondary">
            {t('questions', { count: currentQuiz.total_questions })}
          </p>
          <p className="text-small text-ink-secondary">
            {currentQuiz.use_global_timer
              ? t('timerGlobal', { seconds: currentQuiz.global_timer_seconds })
              : t('timerCustom')}
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink mb-2">{t('nicknameLegend')}</legend>
          {NICKNAME_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
                'focus-within:ring-2 focus-within:ring-primary',
                nicknameMode === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
              )}
            >
              <input
                type="radio"
                name="nicknameMode"
                value={option.value}
                checked={nicknameMode === option.value}
                onChange={() => setNicknameMode(option.value)}
                aria-labelledby={`nickname-mode-${option.value}-label`}
                aria-describedby={`nickname-mode-${option.value}-desc`}
                className="mt-1 accent-primary"
              />
              <span className="space-y-0.5">
                <span id={`nickname-mode-${option.value}-label`} className="block font-medium">
                  {option.label}
                </span>
                <span id={`nickname-mode-${option.value}-desc`} className="block text-small text-ink-secondary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink mb-2">{t('scoringLegend')}</legend>
          {SCORING_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
                'focus-within:ring-2 focus-within:ring-primary',
                scoringMode === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
              )}
            >
              <input
                type="radio"
                name="scoringMode"
                value={option.value}
                checked={scoringMode === option.value}
                onChange={() => setScoringMode(option.value)}
                aria-labelledby={`scoring-mode-${option.value}-label`}
                aria-describedby={`scoring-mode-${option.value}-desc`}
                className="mt-1 accent-primary"
              />
              <span className="space-y-0.5">
                <span id={`scoring-mode-${option.value}-label`} className="block font-medium">
                  {option.label}
                  {option.badge && (
                    <span className="ml-2 rounded-sm bg-primary-50 px-1.5 py-0.5 text-caption font-medium text-primary-700">
                      {option.badge}
                    </span>
                  )}
                </span>
                <span id={`scoring-mode-${option.value}-desc`} className="block text-small text-ink-secondary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <label
          className={cn(
            'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
            'focus-within:ring-2 focus-within:ring-primary',
            hideLeaderboard ? 'border-primary bg-primary-50' : 'border-borderc'
          )}
        >
          <input
            type="checkbox"
            name="hideLeaderboard"
            checked={hideLeaderboard}
            onChange={(e) => setHideLeaderboard(e.target.checked)}
            aria-labelledby="hide-leaderboard-label"
            aria-describedby="hide-leaderboard-desc"
            className="mt-1 accent-primary"
          />
          <span className="space-y-0.5">
            <span id="hide-leaderboard-label" className="block font-medium">
              {t('hideLeaderboard')}
            </span>
            <span id="hide-leaderboard-desc" className="block text-small text-ink-secondary">
              {t('hideLeaderboardDesc')}
            </span>
          </span>
        </label>
        <Button onClick={handleCreate} isLoading={sessionLoading} className="w-full">
          {t('create')}
        </Button>
      </Card>
    </div>
  );
}