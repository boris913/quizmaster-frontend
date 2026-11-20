'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Maximize, Minimize, Pause, Users } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectionFeed, useRemainingSeconds } from '@/hooks/useProjectionFeed';
import { JoinQrCode } from '@/components/ui/JoinQrCode';
import { AnswerHistogram, histogramOptions } from '@/components/ui/AnswerHistogram';
import { getAppBaseUrl, normalizeSessionCode } from '@/lib/sessionCode';
import { cn } from '@/lib/utils';
import { answerTone } from '@/lib/answerTone';
import { useTranslations } from 'next-intl';
import { cumulativeClassAccuracy, isLeaderboardHidden } from '@/types';

/** Nombre maximum de pseudos affichés dans le nuage (les suivants sont résumés en « +N »). */
const MAX_PSEUDOS = 80;



function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setIsFullscreen(Boolean(document.fullscreenElement));
    update();
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // API indisponible ou refusée (iframe, navigateur) : l'écran reste utilisable en fenêtré.
    }
  };

  const supported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
  return { isFullscreen, toggle, supported };
}

/**
 * Écran de projection (vidéoprojecteur) : lecture seule, aucun contrôle de jeu.
 * Avant le jeu : code géant, QR, compteur et nuage des pseudos. Pendant : question et minuteur.
 */
export default function SessionPresentPage() {
  const t = useTranslations('present');
  const tc = useTranslations('common');
  const params = useParams();
  const sessionId = params?.id as string;
  const { currentSession, participants: restParticipants, fetchSession, fetchParticipants } =
    useSessionStore();
  const [loadError, setLoadError] = useState(false);
  const [joinHost, setJoinHost] = useState('');
  const { isFullscreen, toggle, supported } = useFullscreen();

  useEffect(() => {
    if (!sessionId) return;
    fetchSession(sessionId).catch(() => setLoadError(true));
    fetchParticipants(sessionId).catch(() => {});
  }, [sessionId, fetchSession, fetchParticipants]);

  useEffect(() => {
    setJoinHost(`${getAppBaseUrl().replace(/^https?:\/\//, '')}/player/join`);
  }, []);

  const session = currentSession && currentSession.id === sessionId ? currentSession : null;
  const feed = useProjectionFeed(sessionId, session ? restParticipants : undefined);
  const remaining = useRemainingSeconds(feed.phase === 'question' ? feed.question?.endsAt : null);

  const code = normalizeSessionCode(session?.password ?? '');
  const title = (session as any)?.quizzes?.title || session?.quiz_title || t('fallbackTitle');
  const phase = feed.phase === 'lobby' && session?.status === 'finished' ? 'finished' : feed.phase;
  const count = feed.participants.length;
  const visible = feed.participants.slice(-MAX_PSEUDOS);
  const hidden = count - visible.length;
  // Projection vue par toute la classe : si le classement est masqué aux élèves, aucun
  // classement nominatif, seulement la précision de la classe.
  const leaderboardHidden = isLeaderboardHidden(session);
  const classAccuracy = cumulativeClassAccuracy(Object.values(feed.statsByQuestion));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden dark bg-background text-ink"
      data-testid="projection-screen"
    >
      {/* Bandeau supérieur */}
      <header className="flex items-center justify-between gap-6 px-[3vw] py-[2vh]">
        <h1 className="truncate text-[clamp(1.5rem,2.6vw,3rem)] font-bold">{title}</h1>
        <div className="flex shrink-0 items-center gap-6">
          <span
            className="flex items-center gap-3 text-[clamp(1.5rem,2.6vw,3rem)] font-semibold tabular-nums"
            aria-label={t('participantsAria', { count })}
          >
            <Users className="h-[1em] w-[1em]" aria-hidden />
            <span data-testid="participant-count">{count}</span>
          </span>
          {supported && !isFullscreen && (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-md border border-ink/30 px-4 py-2 text-body hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <Maximize className="h-4 w-4" aria-hidden />
              {t('fullscreen')}
            </button>
          )}
          {supported && isFullscreen && (
            <button
              type="button"
              onClick={toggle}
              aria-label={t('exitFullscreen')}
              className="rounded-md p-2 text-ink-tertiary hover:bg-ink/10 hover:text-ink"
            >
              <Minimize className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col px-[3vw] pb-[3vh]">
        {!session && (
          <div className="m-auto text-[clamp(1.5rem,3vw,3rem)] text-ink-secondary">
            {loadError ? t('notFound') : tc('loading')}
          </div>
        )}

        {session && phase === 'lobby' && (
          <div className="flex min-h-0 flex-1 flex-col gap-[3vh]">
            <div className="flex flex-1 items-center justify-center gap-[5vw]">
              <div className="flex flex-col items-center text-center">
                <p className="text-[clamp(1.5rem,2.4vw,2.75rem)] text-ink-secondary">
                  {t.rich('joinOn', { host: joinHost, b: (chunks) => <strong className="text-ink">{chunks}</strong> })}
                </p>
                <p className="mt-[2vh] text-[clamp(1.25rem,2vw,2.25rem)] text-ink-tertiary">
                  {t('code')}
                </p>
                <p
                  className="font-display tabular-nums text-[clamp(7.5rem,13vw,15rem)] font-bold leading-none tracking-[0.12em]"
                  data-testid="session-code"
                >
                  {code}
                </p>
              </div>
              {code && (
                <JoinQrCode code={code} size={320} className="shrink-0" />
              )}
            </div>

            <section aria-label={t('participants')} className="min-h-[18vh]">
              {count === 0 ? (
                <p className="text-center text-[clamp(1.25rem,2vw,2.25rem)] text-ink-tertiary">
                  {t('waitingPlayers')}
                </p>
              ) : (
                <ul className="flex flex-wrap justify-center gap-3" data-testid="pseudo-cloud">
                  {visible.map((p) => (
                    <li
                      key={p.id}
                      className="animate-pop rounded-full bg-ink/10 px-5 py-2 text-[clamp(1.25rem,1.9vw,2.25rem)] font-semibold"
                    >
                      {p.pseudo}
                    </li>
                  ))}
                  {hidden > 0 && (
                    <li className="rounded-full px-5 py-2 text-[clamp(1.25rem,1.9vw,2.25rem)] text-ink-tertiary">
                      +{hidden}
                    </li>
                  )}
                </ul>
              )}
            </section>
          </div>
        )}

        {session && phase === 'countdown' && (
          <div className="m-auto text-center">
            <p className="text-[clamp(1.5rem,3vw,3rem)] text-ink-secondary">{t('ready')}</p>
            <p
              key={feed.countdown ?? 0}
              className="animate-countdown font-display tabular-nums text-[clamp(10rem,25vw,24rem)] font-bold leading-none"
            >
              {feed.countdown}
            </p>
          </div>
        )}

        {session && (phase === 'question' || phase === 'ended') && feed.question && (
          <div className="flex min-h-0 flex-1 flex-col gap-[3vh]">
            <div className="flex items-start justify-between gap-[3vw]">
              <div className="min-w-0">
                <p className="text-[clamp(1.25rem,2vw,2.25rem)] text-ink-tertiary">
                  {t('questionOf', { current: feed.question.number, total: feed.question.total })}
                </p>
                <h2
                  className="mt-2 text-[clamp(2rem,4vw,4.5rem)] font-bold leading-tight"
                  data-testid="question-text"
                >
                  {feed.question.text}
                </h2>
              </div>
              <div
                role="timer"
                aria-live="off"
                aria-label={t('secondsLeft', { seconds: remaining })}
                className={cn(
                  'flex aspect-square w-[clamp(7rem,12vw,13rem)] shrink-0 items-center justify-center rounded-full border-[0.6rem] font-display text-[clamp(3rem,6vw,6.5rem)] font-bold tabular-nums',
                  remaining > 10 ? 'border-success-solid' : remaining > 5 ? 'border-warning-solid' : 'border-danger-solid'
                )}
                data-testid="timer"
              >
                {remaining}
              </div>
            </div>

            {feed.question.options.length > 0 && (
              <ul className="grid flex-1 grid-cols-2 gap-[2vw]">
                {feed.question.options.map((opt, i) => (
                  <li
                    key={opt.id}
                    className={cn(
                      'flex items-center gap-[1.5vw] rounded-xl px-[2vw] py-[2vh] text-[clamp(1.5rem,2.8vw,3.25rem)] font-semibold text-white',
                      answerTone(opt.id, i).bg
                    )}
                  >
                    <span className="flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-md bg-white/20 font-display font-bold">{opt.id}</span>
                    <span className="min-w-0 break-words">{opt.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {phase === 'ended' && (
              <p className="text-center text-[clamp(1.5rem,3vw,3rem)] font-bold">{t('timeUp')}</p>
            )}

            {/* Rappel discret du code pour les retardataires */}
            <p className="text-right text-[clamp(1rem,1.5vw,1.75rem)] text-ink-tertiary">
              {t.rich('reminder', { host: joinHost, code, b: (chunks) => <strong className="font-display text-ink">{chunks}</strong> })}
            </p>
          </div>
        )}

        {session && (phase === 'question' || phase === 'ended') && !feed.question && (
          <div className="m-auto text-[clamp(1.5rem,3vw,3rem)] text-ink-secondary">{t('inProgress')}</div>
        )}

        {session && phase === 'results' && feed.stats && (
          <div className="flex min-h-0 flex-1 flex-col gap-[3vh]" data-testid="projection-results">
            <div className="min-w-0">
              {feed.question && (
                <p className="text-[clamp(1.25rem,2vw,2.25rem)] text-ink-tertiary">
                  {t('resultsOf', { current: feed.question.number, total: feed.question.total })}
                </p>
              )}
              <h2 className="mt-2 text-[clamp(2rem,4vw,4.5rem)] font-bold leading-tight">
                {feed.question?.text ?? t('resultsTitle')}
              </h2>
            </div>
            <AnswerHistogram
              variant="projection"
              options={histogramOptions(feed.question?.options, feed.stats)}
              stats={feed.stats}
            />
          </div>
        )}

        {session && phase === 'finished' && (
          <div className="m-auto w-full max-w-4xl text-center">
            <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-bold">{t('finished')}</h2>
            {leaderboardHidden && (
              <div className="mt-[4vh]" data-testid="final-class-accuracy">
                {classAccuracy !== null ? (
                  <>
                    <p className="font-display text-[clamp(6rem,12vw,12rem)] font-bold leading-none tabular-nums">
                      {t('classAccuracy', { value: classAccuracy })}
                    </p>
                    <p className="mt-[2vh] text-[clamp(1.5rem,2.8vw,3rem)] text-ink-secondary">
                      {t('classAccuracyLabel')}
                    </p>
                  </>
                ) : (
                  <p className="text-[clamp(1.5rem,2.8vw,3rem)] text-ink-secondary">{t('bravo')}</p>
                )}
              </div>
            )}
            {!leaderboardHidden && feed.leaderboard.length > 0 && (
              <ol className="mt-[4vh] space-y-[1.5vh]" data-testid="final-ranking">
                {feed.leaderboard.slice(0, 5).map((e) => (
                  <li
                    key={e.participant_id}
                    className="flex items-center justify-between rounded-lg bg-ink/10 px-[2vw] py-[1.5vh] text-[clamp(1.5rem,2.8vw,3rem)] font-semibold"
                  >
                    <span>
                      {e.rank}. {e.pseudo}
                    </span>
                    <span className="tabular-nums">{tc('pointsCount', { count: e.score })}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {session && feed.paused && phase !== 'finished' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-background/85"
            role="status"
          >
            <p className="flex items-center gap-4 text-[clamp(3rem,6vw,6rem)] font-bold">
              <Pause className="h-[1em] w-[1em]" aria-hidden />
              {t('pause')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
