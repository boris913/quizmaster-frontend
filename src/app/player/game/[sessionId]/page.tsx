'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/store/playerStore';
import { QuestionView } from '@/components/player/QuestionView';
import { AnswerFeedback } from '@/components/player/AnswerFeedback';
import { ScoreDisplay } from '@/components/player/ScoreDisplay';
import { WaitingScreen } from '@/components/player/WaitingScreen';
import { FinalScreen } from '@/components/player/FinalScreen';
import { KickedScreen } from '@/components/player/KickedScreen';
import {
  Question,
  WsQuestionStartPayload,
  WsQuestionRevealPayload,
  LeaderboardEntry,
  PlayerAnswerResult,
  normalizeAnswerResult,
  normalizePlayerQuizFinished,
  normalizePlayerScore,
  normalizeQuestionReveal,
} from '@/types';
import { Card } from '@/components/ui/Card';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoreCounter } from '@/components/ui/ScoreCounter';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

export default function GamePage() {
  const t = useTranslations('player');
  const tc = useTranslations('common');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const participantId = searchParams.get('participantId');

  const { socket, isConnected } = useSocket();
  const {
    participant,
    setParticipant,
    setScore,
    setRank,
    setTotalParticipants,
    setIsAnswered,
    setIsWaiting,
    setIsFinished,
    reset,
  } = usePlayerStore();

  const [question, setQuestion] = useState<Omit<Question, 'correct_answers'> | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isAnsweredLocal, setIsAnsweredLocal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PlayerAnswerResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [reveal, setReveal] = useState<WsQuestionRevealPayload | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalMessage, setFinalMessage] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [scoreState, setScoreState] = useState(0);
  const [rankState, setRankState] = useState<number | null>(null);
  const [totalParts, setTotalParts] = useState(0);
  const [gapToNext, setGapToNext] = useState<number | null>(null);
  const [gapToPodium, setGapToPodium] = useState<number | null>(null);
  const [onPodium, setOnPodium] = useState(false);
  const [kicked, setKicked] = useState(false);
  // Classement masqué aux élèves (backend #8) : déduit des payloads reçus (`player:score`,
  // `answer:result` sans rang, `quiz:finished` sans classement). Une fois vu, il le reste.
  const [leaderboardHidden, setLeaderboardHidden] = useState(false);
  const [classAccuracy, setClassAccuracy] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  // Réinitialiser l'état du joueur au montage
  useEffect(() => {
    reset();
    return () => reset();
  }, []);

  // Rejoindre la salle
  useEffect(() => {
    // Joueur exclu : ne plus jamais réémettre « participant:join ».
    if (!socket || !isConnected || !participantId || kicked) return;

    socket.emit('participant:join', {
      sessionId,
      participantId,
      role: 'participant',
    });

    // Écouter les événements
    socket.on('participant:join:success', (data: any) => {
      setParticipant(data.participant);
      setScore(data.participant?.score || 0);
      setWaiting(false);
    });

    socket.on('question:countdown', (data: { countdown: number; message: string }) => {
      // On pourrait afficher un countdown ici
    });

    socket.on('question:start', (data: WsQuestionStartPayload) => {
      setQuestion(data.question);
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);
      setTimerSeconds(data.timer_seconds);
      questionStartTimeRef.current = Date.now();
      setIsAnsweredLocal(false);
      setShowResult(false);
      setResult(null);
      setReveal(null);
      setWaiting(false);
      setPaused(false);
      setSelectedAnswers([]);
      setScoreState(participant?.score || 0);
    });

    socket.on('answer:result', (raw: unknown) => {
      const data = normalizeAnswerResult(raw);
      if (!data) return;
      setResult(data);
      setShowResult(true);
      setIsAnsweredLocal(true);
      setScoreState(data.total_score);
      setScore(data.total_score);
      setIsAnswered(true);
      if (data.rank === null) {
        // Classement masqué : ni rang, ni écarts, ni podium dans le payload.
        setLeaderboardHidden(true);
        setRankState(null);
        setGapToNext(null);
        setGapToPodium(null);
        setOnPodium(false);
        return;
      }
      setRankState(data.rank);
      setTotalParts(data.total_participants ?? 0);
      setGapToNext(data.gap_to_next);
      setGapToPodium(data.gap_to_podium);
      setOnPodium(data.on_podium);
      setRank(data.rank);
      setTotalParticipants(data.total_participants ?? 0);
    });

    // Classement masqué (backend #8) : score personnel et précision de la classe à la clôture.
    socket.on('player:score', (raw: unknown) => {
      const data = normalizePlayerScore(raw);
      if (!data) return;
      setLeaderboardHidden(true);
      setScoreState(data.score);
      setScore(data.score);
      setCorrectCount(data.correctCount);
      setClassAccuracy(data.classAccuracy);
      setRankState(null);
    });

    socket.on('answer:too_late', () => {
      setIsAnsweredLocal(true);
      setShowResult(true);
      setResult({
        is_correct: false,
        points_earned: 0,
        max_points: 0,
        time_taken_ms: 0,
        correct_answers: [],
        your_answer: [],
        total_score: scoreState,
        rank: rankState,
        total_participants: totalParts || null,
        gap_to_next: null,
        gap_to_podium: null,
        on_podium: false,
        waiting_for_timer: true,
      });
    });

    socket.on('question:ended', (data: { question_id: string; correct_answers: string[]; leaderboard: LeaderboardEntry[] }) => {
      // La question est finie, on peut afficher le classement
    });

    // Correction envoyée à la clôture : verdict, bonne réponse et explication (#5).
    socket.on('question:reveal', (raw: unknown) => {
      const data = normalizeQuestionReveal(raw);
      if (!data) return;
      setReveal(data);
      setShowResult(true);
      setIsAnsweredLocal(true);
    });

    socket.on('question:in_progress', (data: { question_id: string; time_remaining_ms: number }) => {
      // Si le participant rejoint en cours de question
    });

    socket.on('session:paused', () => {
      setPaused(true);
    });

    socket.on('session:resumed', () => {
      setPaused(false);
    });

    socket.on('quiz:finished', (raw: unknown) => {
      const data = normalizePlayerQuizFinished(raw);
      setFinished(true);
      setIsFinished(true);
      setScoreState(data.yourScore);
      setScore(data.yourScore);
      if (data.kind === 'hidden') {
        // Classement masqué : précision de la classe et score personnel, sans podium.
        setLeaderboardHidden(true);
        setClassAccuracy(data.classAccuracy);
        setFinalLeaderboard([]);
        setRankState(null);
        return;
      }
      setFinalLeaderboard(data.finalLeaderboard);
      setFinalMessage(data.message);
      setRankState(data.yourRank);
      setRank(data.yourRank ?? 0);
      if (data.totalParticipants !== null) {
        setTotalParts(data.totalParticipants);
        setTotalParticipants(data.totalParticipants);
      }
    });

    socket.on('error', (data: any) => {
      console.error('Erreur:', data.message);
    });

    // Exclusion par le créateur (ou reconnexion refusée) : le serveur déconnecte ensuite le
    // socket. On oublie la partie côté joueur.
    socket.on('participant:kicked', () => {
      setKicked(true);
      reset();
    });

    return () => {
      socket.off('participant:kicked');
      socket.off('participant:join:success');
      socket.off('question:countdown');
      socket.off('question:start');
      socket.off('answer:result');
      socket.off('answer:too_late');
      socket.off('player:score');
      socket.off('question:ended');
      socket.off('question:reveal');
      socket.off('question:in_progress');
      socket.off('session:paused');
      socket.off('session:resumed');
      socket.off('quiz:finished');
      socket.off('error');
    };
  }, [socket, isConnected, sessionId, participantId, participant?.score, kicked]);

  const handleAnswer = (answers: string[]) => {
    setSelectedAnswers(answers);
  };

  const handleSubmit = () => {
    if (!socket || !isConnected || !question || isAnsweredLocal) return;
    setIsSubmitting(true);

    const timeTakenMs = Date.now() - questionStartTimeRef.current;

    socket.emit('answer:submit', {
      sessionId,
      participantId,
      questionId: question.id,
      answers: selectedAnswers,
      timeTakenMs: Math.min(timeTakenMs, timerSeconds * 1000),
    });

    setTimeout(() => setIsSubmitting(false), 500);
  };

  // Joueur exclu par le créateur : prioritaire sur tous les autres écrans.
  if (kicked) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <KickedScreen />
      </div>
    );
  }

  // Écran de fin
  if (finished) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <FinalScreen
          hideRanking={leaderboardHidden}
          classAccuracy={classAccuracy}
          finalLeaderboard={finalLeaderboard}
          yourRank={rankState ?? 0}
          yourScore={scoreState}
          isWinner={rankState === 1}
          winnerPseudo={finalLeaderboard[0]?.pseudo || null}
          totalParticipants={totalParts || finalLeaderboard.length}
          totalQuestions={totalQuestions}
          message={finalMessage}
          onPlayAgain={() => router.push('/player/join')}
        />
      </div>
    );
  }

  // Écran d'attente
  if (waiting || paused) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <WaitingScreen
          message={paused ? t('game.paused') : t('game.waitingStart')}
          isPaused={paused}
        />
      </div>
    );
  }

  // Écran de résultat après une question
  if (showResult && (result || reveal)) {
    const isCorrect = reveal ? reveal.isCorrect : Boolean(result?.is_correct);
    return (
      <div className="min-h-screen bg-background p-6">
        <motion.div key="result" {...pageTransition} className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center text-small text-ink-secondary">
            <span>{t('question.counterShort', { current: questionNumber, total: totalQuestions })}</span>
            <span className={cn('inline-flex items-center gap-1 font-medium', isCorrect ? 'text-success' : 'text-danger')}>
              {isCorrect ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
              {tc('pointsCount', { count: result?.points_earned ?? 0 })}
            </span>
          </div>
          <AnswerFeedback
            result={
              result
                ? {
                    isCorrect: result.is_correct,
                    pointsEarned: result.points_earned,
                    maxPoints: result.max_points,
                    timeTakenMs: result.time_taken_ms,
                    correctAnswers: result.correct_answers ?? [],
                    yourAnswers: result.your_answer ?? [],
                    // « Temps écoulé » seulement sans réponse : une réponse fausse reste une réponse.
                    status: result.your_answer?.length ? 'answered' : 'timeout',
                  }
                : null
            }
            reveal={reveal}
            options={question?.options}
          />
          <ScoreDisplay
            score={scoreState}
            rank={rankState}
            totalParticipants={totalParts || null}
            gapToNext={gapToNext}
            gapToPodium={gapToPodium}
            onPodium={onPodium}
            hideRanking={leaderboardHidden}
            classAccuracy={classAccuracy}
            correctCount={correctCount}
          />
          <p className="text-center text-small text-ink-secondary">
            {reveal ? t('game.waitingNext') : t('game.revealAtEnd')}
          </p>
        </motion.div>
      </div>
    );
  }

  // Écran de question
  if (question) {
    return (
      <div className="min-h-screen bg-background p-6">
        <motion.div key={question.id} {...pageTransition} className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4 text-small">
            <span className="text-ink-secondary">
              {t('question.counterShort', { current: questionNumber, total: totalQuestions })}
            </span>
            <span className="font-semibold text-ink bg-surface border border-borderc rounded-full px-3 py-1">
              {participant?.pseudo} • <ScoreCounter value={scoreState} durationMs={500} /> {tc('points')}
            </span>
          </div>
          <QuestionView
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            timerSeconds={timerSeconds}
            onAnswer={handleAnswer}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isAnswered={isAnsweredLocal}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card tier="primary" className="p-8 text-center">
        <p className="text-ink-secondary">{t('game.loading')}</p>
      </Card>
    </div>
  );
}
