'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/store/authStore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { SessionControl } from '@/components/creator/SessionControl';
import { LiveLeaderboard } from '@/components/creator/LiveLeaderboard';
import { ParticipantList } from '@/components/creator/ParticipantList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JoinQrCode } from '@/components/ui/JoinQrCode';
import { ArrowLeft, MonitorPlay, Users } from 'lucide-react';
import { LeaderboardEntry, WsParticipantProgressPayload } from '@/types';

export default function SessionControlPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { socket, isConnected } = useSocket();
  const { token } = useAuthStore();
  const { currentSession, participants, fetchSession, fetchParticipants } = useSession();
  const { leaderboard } = useLeaderboard(sessionId);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const joinedRef = useRef(false);

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

    // --- Écouteurs d'événements ---

    // Participant rejoint
    socket.on('participant:joined', (data: any) => {
      fetchParticipants(sessionId);
      setParticipantCount((prev) => prev + 1);
    });

    // Participant déconnecté
    socket.on('participant:disconnected', (data: any) => {
      fetchParticipants(sessionId);
      setParticipantCount((prev) => prev - 1);
    });

    // Participant a répondu (progression)
    socket.on('participant:answered', (data: WsParticipantProgressPayload) => {
      setProgressMap((prev) => ({
        ...prev,
        [data.participant_id]: data.progress_percentage,
      }));
    });

    // 🔄 Mise à jour automatique du panneau de contrôle
    socket.on('question:start', () => {
      fetchSession(sessionId);
    });

    socket.on('session:paused', () => {
      fetchSession(sessionId);
    });

    socket.on('session:resumed', () => {
      fetchSession(sessionId);
    });

    socket.on('quiz:finished', () => {
      fetchSession(sessionId);
    });

    // Erreur
    socket.on('error', (data: any) => {
      console.error('Erreur WebSocket:', data.message);
    });

    // --- Cleanup ---
    return () => {
      socket.off('participant:joined');
      socket.off('participant:disconnected');
      socket.off('participant:answered');
      socket.off('question:start');
      socket.off('session:paused');
      socket.off('session:resumed');
      socket.off('quiz:finished');
      socket.off('error');
    };
  }, [socket, isConnected, token, sessionId, fetchParticipants, fetchSession]);

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
    if (confirm('Terminer le quiz définitivement ?')) {
      socket.emit('quiz:end', { sessionId });
      // Le backend n'émet pas d'événement de fin vers la salle créateur (quiz:finished ne
      // vise que les participants) : on relit la session pour afficher « Voir le rapport ».
      setTimeout(() => fetchSession(sessionId), 1500);
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">Chargement...</p>
      </div>
    );
  }

  const totalQuestions = (currentSession as any).quizzes?.total_questions || 0;
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
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {(currentSession as any).quizzes?.title || 'Session'}
              </h1>
              <div className="flex items-center gap-3 text-sm text-ink-secondary">
                <span>Code: <strong className="font-mono">{currentSession.password}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {participantCount} participants
                </span>
                <span>•</span>
                <span>Statut: <span className="capitalize">{currentSession.status}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/creator/session/${sessionId}/present`}
                target="_blank"
                rel="noopener"
                title="Ouvre l'écran de projection dans un nouvel onglet"
              >
                <MonitorPlay className="w-4 h-4 mr-2" />
                Mode projection
              </Link>
            </Button>
            <div className="text-sm text-ink-secondary">
              {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4">
              <SessionControl
                status={currentSession.status}
                currentQuestion={currentQIndex}
                totalQuestions={totalQuestions}
                onStartQuestion={handleStartQuestion}
                onPause={handlePause}
                onResume={handleResume}
                onEnd={handleEnd}
                isStarting={isStarting}
                reportHref={`/creator/session/${sessionId}/results`}
              />
            </Card>

            <LiveLeaderboard
              entries={leaderboard}
              totalParticipants={participantCount}
              currentQuestion={Math.max(0, currentQIndex)}
              totalQuestions={totalQuestions}
            />
          </div>

          <div className="space-y-6">
            {currentSession.status !== 'finished' && currentSession.password && (
              <Card className="p-4 flex items-center gap-4">
                <JoinQrCode code={currentSession.password} size={112} />
                <div className="min-w-0 space-y-1">
                  <p className="text-small font-medium text-ink">Rejoindre la session</p>
                  <p className="text-caption text-ink-secondary">
                    Scanner le QR code ou saisir le code
                  </p>
                  <p className="font-mono text-h3 tracking-widest">{currentSession.password}</p>
                </div>
              </Card>
            )}
            <ParticipantList
              participants={participants || []}
              progressMap={progressMap}
              liveScores={liveScores}
            />
          </div>
        </div>
      </div>
    </div>
  );
}