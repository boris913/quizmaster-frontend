'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { useAuthStore } from '@/store/authStore';
import type {
  LeaderboardEntry,
  Participant,
  WsQuestionCountdownPayload,
  WsQuestionEndPayload,
  WsQuestionStartPayload,
} from '@/types';

export type ProjectionPhase = 'lobby' | 'countdown' | 'question' | 'ended' | 'finished';

export interface ProjectionQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  number: number;
  total: number;
  timerSeconds: number;
  /** Instant local (Date.now()) de fin du minuteur. Horloge locale : pas de décalage serveur. */
  endsAt: number;
}

export interface ProjectionState {
  phase: ProjectionPhase;
  paused: boolean;
  countdown: number | null;
  question: ProjectionQuestion | null;
  /** Participants connectés, indexés par id (ordre d'arrivée conservé). */
  participants: { id: string; pseudo: string }[];
  leaderboard: LeaderboardEntry[];
}

const initialState: ProjectionState = {
  phase: 'lobby',
  paused: false,
  countdown: null,
  question: null,
  participants: [],
  leaderboard: [],
};

function upsert(list: ProjectionState['participants'], p: { id: string; pseudo: string }) {
  if (!p?.id) return list;
  if (list.some((x) => x.id === p.id)) {
    return list.map((x) => (x.id === p.id ? { id: p.id, pseudo: p.pseudo ?? x.pseudo } : x));
  }
  return [...list, { id: p.id, pseudo: p.pseudo }];
}

function connected(participants: Participant[] | undefined | null) {
  return (participants ?? [])
    .filter((p) => p && p.status !== 'disconnected')
    .map((p) => ({ id: p.id, pseudo: p.pseudo }));
}

/**
 * Flux en LECTURE SEULE pour l'écran de projection.
 *
 * Rejoint la salle créateur (`creator:join`, nécessaire pour recevoir les arrivées de
 * participants) puis écoute les événements déjà utilisés par la page de contrôle et par
 * les joueurs. N'émet AUCUN événement de contrôle (question:start, session:pause, quiz:end…).
 *
 * Les écouteurs sont retirés par référence (`off(event, handler)`) pour ne pas toucher à ceux
 * des autres composants partageant le même socket.
 */
export function useProjectionFeed(sessionId: string, initialParticipants?: Participant[]) {
  const { socket, isConnected } = useSocket();
  const token = useAuthStore((s) => s.token);
  const [state, setState] = useState<ProjectionState>(initialState);

  // Liste REST fusionnée (idempotent) à chaque nouvelle réponse : les réponses session et
  // participants arrivent dans un ordre quelconque.
  useEffect(() => {
    if (!initialParticipants?.length) return;
    setState((s) => ({
      ...s,
      participants: connected(initialParticipants).reduce(upsert, s.participants),
    }));
  }, [initialParticipants]);

  useEffect(() => {
    if (!socket || !isConnected || !token || !sessionId) return;

    const onJoinSuccess = (data: { participants?: Participant[]; leaderboard?: LeaderboardEntry[] }) => {
      setState((s) => ({
        ...s,
        participants: connected(data?.participants).reduce(upsert, s.participants),
        leaderboard: Array.isArray(data?.leaderboard) && data.leaderboard.length ? data.leaderboard : s.leaderboard,
      }));
    };

    const onParticipantJoined = (data: { participant?: Participant }) => {
      const p = data?.participant;
      if (!p) return;
      setState((s) => ({ ...s, participants: upsert(s.participants, p) }));
    };

    const onParticipantDisconnected = (data: { participant_id?: string }) => {
      setState((s) => ({
        ...s,
        participants: s.participants.filter((p) => p.id !== data?.participant_id),
      }));
    };

    const onCountdown = (data: WsQuestionCountdownPayload) => {
      setState((s) => ({ ...s, phase: 'countdown', countdown: data?.countdown ?? null, paused: false }));
    };

    const onQuestionStart = (data: WsQuestionStartPayload) => {
      const q = data?.question;
      if (!q) return;
      const timerSeconds = Number(data.timer_seconds ?? q.timer_seconds ?? 0);
      setState((s) => ({
        ...s,
        phase: 'question',
        paused: false,
        countdown: null,
        question: {
          id: q.id,
          text: q.text,
          options: Array.isArray(q.options) ? q.options : [],
          number: data.question_number,
          total: data.total_questions,
          timerSeconds,
          endsAt: Date.now() + timerSeconds * 1000,
        },
      }));
    };

    const onQuestionEnded = (data: WsQuestionEndPayload) => {
      setState((s) => ({
        ...s,
        phase: s.phase === 'finished' ? s.phase : 'ended',
        leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : s.leaderboard,
        question: s.question ? { ...s.question, endsAt: Math.min(s.question.endsAt, Date.now()) } : null,
      }));
    };

    const onLeaderboard = (data: { leaderboard?: LeaderboardEntry[] }) => {
      if (Array.isArray(data?.leaderboard)) {
        setState((s) => ({ ...s, leaderboard: data.leaderboard! }));
      }
    };

    const onPaused = () => setState((s) => ({ ...s, paused: true }));
    const onResumed = () => setState((s) => ({ ...s, paused: false }));

    const onFinished = (data: { final_leaderboard?: LeaderboardEntry[] }) => {
      setState((s) => ({
        ...s,
        phase: 'finished',
        paused: false,
        leaderboard: Array.isArray(data?.final_leaderboard) ? data.final_leaderboard : s.leaderboard,
      }));
    };

    const handlers: [string, (...args: any[]) => void][] = [
      ['creator:join:success', onJoinSuccess],
      ['participant:joined', onParticipantJoined],
      ['participant:disconnected', onParticipantDisconnected],
      ['question:countdown', onCountdown],
      ['question:start', onQuestionStart],
      ['question:ended', onQuestionEnded],
      ['leaderboard:update', onLeaderboard],
      ['session:paused', onPaused],
      ['session:resumed', onResumed],
      ['quiz:finished', onFinished],
    ];
    handlers.forEach(([event, handler]) => socket.on(event, handler));

    // Seule émission : rejoindre la salle pour recevoir les événements (aucun contrôle).
    socket.emit('creator:join', { sessionId, token });

    return () => {
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [socket, isConnected, token, sessionId]);

  return state;
}

/** Secondes restantes (arrondi supérieur), rafraîchies plusieurs fois par seconde. */
export function useRemainingSeconds(endsAt: number | null | undefined): number {
  const compute = () => (endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0);
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute());
    if (!endsAt) return;
    const id = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  return remaining;
}
