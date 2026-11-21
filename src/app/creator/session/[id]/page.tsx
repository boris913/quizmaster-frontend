'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/store/authStore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useQuestionResults } from '@/hooks/useQuestionResults';
import { SessionControl } from '@/components/creator/SessionControl';
import { LiveLeaderboard } from '@/components/creator/LiveLeaderboard';
import { ParticipantList } from '@/components/creator/ParticipantList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JoinQrCode } from '@/components/ui/JoinQrCode';
import { ArrowLeft, MonitorPlay, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LeaderboardEntry,
  Participant,
  WsParticipantProgressPayload,
  getScoringMode,
  isLeaderboardHidden,
} from '@/types';
import { useSessionStore } from '@/store/sessionStore';

export default function SessionControlPage() {
  const t = useTranslations('sessionPage');
  const tc = useTranslations('common');
  const ts = useTranslations('status');
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { socket, isConnected } = useSocket();
  const { token } = useAuthStore();
  const { currentSession, participants, fetchSession, fetchParticipants } = useSession();
  const { leaderboard } = useLeaderboard(sessionId);
  const questionResults = useQuestionResults();
  const removeParticipant = useSessionStore((state) => state.removeParticipant);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const joinedRef = useRef(false);
  // Fin de partie reçue en direct (quiz:finished, aussi émis vers la salle créateur) :
  // le CTA « Voir le rapport » s'affiche sans attendre la relecture de la session.
  const [quizFinished, setQuizFinished] = useState(false);
  const endFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEndFallback = () => {
    if (endFallbackRef.current) {
      clearTimeout(endFallbackRef.current);
      endFallbackRef.current = null;
    }
  };

  // Annule la relecture de secours au démontage.
  useEffect(() => clearEndFallback, []);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
      fetchParticipants(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (participants) {
      setParticipantCount(participants.length);
    }
  }, [participants]);

  // Rejoindre la salle créateur via WebSocket
  useEffect(() => {
    if (!socket || !isConnected || !token || joinedRef.current) return;

    socket.emit('creator:join', {
      sessionId,
      token,
    });

    joinedRef.current = true;
  }, [socket, isConnected, token, sessionId]);

  // --- Écouteurs d'événements ---
  // Posés à chaque exécution de l'effet et retirés **par handler** : un `socket.off(event)`
  // sans handler retirerait aussi les écouteurs des hooks partagés (useQuestionResults écoute
  // question:start et quiz:finished), et l'ancien garde `joinedRef` empêchait de les reposer.
  useEffect(() => {
    if (!socket) return;

    const onParticipantJoined = () => {
      fetchParticipants(sessionId);
      setParticipantCount((prev) => prev + 1);
    };

    const onParticipantDisconnected = (data: { participant_id?: string; reason?: string }) => {
      // Exclusion confirmée par le serveur : retrait immédiat de la liste (le compteur suit
      // la longueur de la liste).
      if (data?.reason === 'kicked' && data.participant_id) {
        removeParticipant(data.participant_id);
        return;
      }
      fetchParticipants(sessionId);
      setParticipantCount((prev) => prev - 1);
    };

    const onParticipantAnswered = (data: WsParticipantProgressPayload) => {
      setProgressMap((prev) => ({
        ...prev,
        [data.participant_id]: data.progress_percentage,
      }));
    };

    // Mise à jour automatique du panneau de contrôle
    const onSessionChanged = () => {
      fetchSession(sessionId);
    };

    const onQuizFinished = () => {
      clearEndFallback();
      setQuizFinished(true);
      fetchSession(sessionId);
    };

    const onError = (data: any) => {
      console.error('Erreur WebSocket:', data?.message);
    };

    socket.on('participant:joined', onParticipantJoined);
    socket.on('participant:disconnected', onParticipantDisconnected);
    socket.on('participant:answered', onParticipantAnswered);
    socket.on('question:start', onSessionChanged);
    socket.on('session:paused', onSessionChanged);
    socket.on('session:resumed', onSessionChanged);
    socket.on('quiz:finished', onQuizFinished);
    socket.on('error', onError);

    return () => {
      socket.off('participant:joined', onParticipantJoined);
      socket.off('participant:disconnected', onParticipantDisconnected);
      socket.off('participant:answered', onParticipantAnswered);
      socket.off('question:start', onSessionChanged);
      socket.off('session:paused', onSessionChanged);
      socket.off('session:resumed', onSessionChanged);
      socket.off('quiz:finished', onQuizFinished);
      socket.off('error', onError);
    };
  }, [socket, sessionId, fetchParticipants, fetchSession, removeParticipant]);

  // Exclusion d'un participant (confirmée dans ParticipantList). Le retrait de la liste se fait
  // à réception de « participant:disconnected » avec reason: 'kicked'.
  const handleKick = (participant: Participant) => {
    if (!socket || !isConnected) return;
    socket.emit('creator:kick', { sessionId, participantId: participant.id });
  };

  // Actions du créateur
  const handleStartQuestion = () => {
    if (!socket || !isConnected) return;
    setIsStarting(true);
    socket.emit('question:start', {
      sessionId,
      questionIndex: (currentSession?.current_question_index ?? -1) + 1,
    });
    setTimeout(() => setIsStarting(false), 1000);
  };

  const handlePause = () => {
    if (!socket || !isConnected) return;
    socket.emit('session:pause', { sessionId });
  };

  const handleResume = () => {
    if (!socket || !isConnected) return;
    socket.emit('session:resume', { sessionId });
  };

  const handleEnd = () => {
    if (!socket || !isConnected) return;
    if (confirm(t('confirmEnd'))) {
      socket.emit('quiz:end', { sessionId });
      // Filet de sécurité si quiz:finished n'arrive pas (backend plus ancien, événement perdu) :
      // relecture de la session après 3 s, annulée dès réception de l'événement.
      clearEndFallback();
      endFallbackRef.current = setTimeout(() => {
        endFallbackRef.current = null;
        fetchSession(sessionId);
      }, 3000);
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">{tc('loading')}</p>
      </div>
    );
  }

  const totalQuestions = (currentSession as any).quizzes?.total_questions || 0;
  const status = quizFinished ? 'finished' : currentSession.status;
  const currentQIndex = currentSession.current_question_index ?? -1;

  // Carte des scores en direct, dérivée du classement temps réel (mis à jour par
  // useLeaderboard via les événements socket 'leaderboard:update' / 'question:ended').
  // Cela permet à la liste des participants de se rafraîchir automatiquement
  // dès qu'un joueur répond, sans recharger la page.
  const liveScores = leaderboard.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.participant_id] = entry.score;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/creator/dashboard">
                <ArrowLeft className="w-4 h-4" />
                {tc('back')}
              </Link>
            </Button>
            <div>
              <h1 className="text-h2">
                {(currentSession as any).quizzes?.title || t('fallbackTitle')}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-small text-ink-secondary">
                <span>{t('code')} <strong className="font-display tracking-[0.08em]">{currentSession.password}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t('participants', { count: participantCount })}
                </span>
                <span>•</span>
                <span>{t('status', { status: ts(status) })}</span>
                <span>•</span>
                <span data-testid="session-scoring-mode">
                  {getScoringMode(currentSession) === 'accuracy' ? t('modeAccuracy') : t('modeSpeed')}
                  {isLeaderboardHidden(currentSession) && t('rankingHidden')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/creator/session/${sessionId}/present`}
                target="_blank"
                rel="noopener"
                title={t('projectionTitle')}
              >
                <MonitorPlay className="w-4 h-4" />
                {t('projection')}
              </Link>
            </Button>
            <div className="text-small text-ink-secondary">
              <span
                aria-hidden
                className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', isConnected ? 'bg-success-solid' : 'bg-danger-solid')}
              />
              {isConnected ? t('connected') : t('disconnected')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4">
              <SessionControl
                status={status}
                currentQuestion={currentQIndex}
                totalQuestions={totalQuestions}
                onStartQuestion={handleStartQuestion}
                onPause={handlePause}
                onResume={handleResume}
                onEnd={handleEnd}
                isStarting={isStarting}
                questionResults={
                  questionResults.view === 'results' && questionResults.stats
                    ? {
                        stats: questionResults.stats,
                        options: questionResults.options,
                        questionType: questionResults.questionType,
                        questionText: questionResults.questionText,
                        imageUrl: questionResults.imageUrl,
                      }
                    : null
                }
                onShowLeaderboard={questionResults.showLeaderboard}
                reportHref={`/creator/session/${sessionId}/results`}
              />
            </Card>

            {/* Étape « résultats » : le classement attend le clic sur « Afficher le classement ». */}
            {!(questionResults.view === 'results' && currentSession.status === 'active') && (
              <LiveLeaderboard
                entries={leaderboard}
                totalParticipants={participantCount}
                currentQuestion={Math.max(0, currentQIndex)}
                totalQuestions={totalQuestions}
              />
            )}
          </div>

          <div className="space-y-6">
            {status !== 'finished' && currentSession.password && (
              <Card className="p-4 flex items-center gap-4">
                <JoinQrCode code={currentSession.password} size={112} />
                <div className="min-w-0 space-y-1">
                  <p className="text-small font-medium text-ink">{t('joinTitle')}</p>
                  <p className="text-caption text-ink-secondary">
                    {t('joinHint')}
                  </p>
                  <p className="font-display text-h3 font-bold tracking-[0.12em] tabular-nums">{currentSession.password}</p>
                </div>
              </Card>
            )}
            <ParticipantList
              participants={participants || []}
              progressMap={progressMap}
              liveScores={liveScores}
              onKick={currentSession.status !== 'finished' ? handleKick : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}