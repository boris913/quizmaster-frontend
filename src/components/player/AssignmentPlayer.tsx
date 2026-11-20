'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, CheckCircle2, Lock, SearchX, WifiOff } from 'lucide-react';
import { QuestionView } from '@/components/player/QuestionView';
import { AnswerFeedback } from '@/components/player/AnswerFeedback';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  clearAssignmentSession,
  fetchNextQuestion,
  formatDueDate,
  getAssignmentError,
  loadAssignmentSession,
  saveAssignmentSession,
  startAssignment,
  submitAssignmentAnswer,
  type AssignmentError,
} from '@/lib/assignments';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  NICKNAME_PATTERN_MESSAGE,
} from '@/lib/nickname';
import type {
  AssignmentAnswerResult,
  AssignmentNext,
  AssignmentSummary,
  Question,
} from '@/types';

type QuestionStep = Extract<AssignmentNext, { done: false }>;

type Phase =
  | { name: 'loading' }
  | { name: 'pseudo' }
  | { name: 'question'; step: QuestionStep }
  | { name: 'feedback'; step: QuestionStep; result: AssignmentAnswerResult; answers: string[] }
  | { name: 'done'; summary: AssignmentSummary }
  | { name: 'blocked'; error: AssignmentError };

/** Erreurs qui empêchent définitivement de continuer (pas de nouvel essai possible). */
const BLOCKING_KINDS = new Set(['notFound', 'expired', 'closed', 'kicked']);

function sameAnswers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((x) => set.has(x));
}

function validatePseudo(value: string): string | null {
  const pseudo = value.trim();
  if (pseudo.length < NICKNAME_MIN_LENGTH) return `Au moins ${NICKNAME_MIN_LENGTH} caractères.`;
  if (pseudo.length > NICKNAME_MAX_LENGTH) return `${NICKNAME_MAX_LENGTH} caractères maximum.`;
  if (!NICKNAME_PATTERN.test(pseudo)) return NICKNAME_PATTERN_MESSAGE;
  return null;
}

function BlockedScreen({ error, onRetry }: { error: AssignmentError; onRetry: () => void }) {
  const Icon =
    error.kind === 'expired'
      ? CalendarClock
      : error.kind === 'closed'
        ? Lock
        : error.kind === 'notFound'
          ? SearchX
          : error.kind === 'network'
            ? WifiOff
            : AlertTriangle;
  const title =
    error.kind === 'expired'
      ? 'Échéance passée'
      : error.kind === 'closed'
        ? 'Devoir clos'
        : error.kind === 'notFound'
          ? 'Devoir introuvable'
          : 'Oups';
  return (
    <Card tier="primary" className="max-w-md mx-auto p-8 text-center space-y-4" role="alert" data-testid="assignment-blocked">
      <Icon className="w-12 h-12 mx-auto text-ink-secondary" aria-hidden="true" />
      <h1 className="text-h2">{title}</h1>
      <p className="text-ink-secondary">{error.message}</p>
      {BLOCKING_KINDS.has(error.kind) ? (
        <Button variant="outline" asChild>
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      ) : (
        <Button onClick={onRetry}>Réessayer</Button>
      )}
    </Card>
  );
}

function DoneScreen({ summary, pseudo }: { summary: AssignmentSummary; pseudo: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="assignment-done">
      <Card tier="primary" className="p-8 text-center space-y-3">
        <CheckCircle2 className="w-14 h-14 mx-auto text-success" aria-hidden="true" />
        <h1 className="text-h2">Devoir terminé{pseudo ? `, ${pseudo}` : ''} !</h1>
        <p className="text-h1 font-bold text-primary-700" data-testid="assignment-score">
          {summary.score} <span className="text-h3 font-medium">pts</span>
        </p>
        {summary.correctCount !== null && summary.totalQuestions !== null && (
          <p className="text-ink-secondary">
            {summary.correctCount} bonne{summary.correctCount > 1 ? 's' : ''} réponse
            {summary.correctCount > 1 ? 's' : ''} sur {summary.totalQuestions}
          </p>
        )}
        <p className="text-small text-ink-secondary">Tes réponses ont été transmises à ton enseignant.</p>
      </Card>

      {summary.review.length > 0 && (
        <section aria-labelledby="assignment-review-title" className="space-y-4">
          <h2 id="assignment-review-title" className="text-h3">
            Correction
          </h2>
          {summary.review.map((item, index) => (
            <div key={item.questionId} className="space-y-2">
              <p className="font-medium text-ink">
                {index + 1}. {item.text}
              </p>
              <AnswerFeedback
                reveal={{
                  questionId: item.questionId,
                  correctAnswers: item.correctAnswers,
                  explanation: item.explanation,
                  yourAnswers: item.yourAnswers,
                  isCorrect: item.isCorrect,
                }}
                options={item.options}
                questionType={item.type ?? undefined}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/**
 * Parcours élève d'un devoir : pseudo -> questions une par une -> écran de fin.
 * Le jeton de reprise est gardé en localStorage pour reprendre après fermeture de l'onglet.
 */
export function AssignmentPlayer({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [pseudo, setPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const answersRef = useRef<string[]>([]);
  const submittingRef = useRef(false);
  const initRef = useRef(false);

  const handleFlowError = useCallback(
    (err: unknown, step: 'next' | 'answer') => {
      const error = getAssignmentError(err, step);
      if (error.kind === 'invalidToken') {
        clearAssignmentSession(code);
        tokenRef.current = null;
        setNotice(error.message);
        setPhase({ name: 'pseudo' });
        return;
      }
      if (BLOCKING_KINDS.has(error.kind) || step === 'next') {
        setPhase({ name: 'blocked', error });
        return;
      }
      setInlineError(error.message);
    },
    [code]
  );

  const loadNext = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) {
      setPhase({ name: 'pseudo' });
      return;
    }
    setIsBusy(true);
    setInlineError(null);
    try {
      const next = await fetchNextQuestion(code, token);
      if (next.dueAt) setDueAt(next.dueAt);
      answersRef.current = [];
      setPhase(next.done ? { name: 'done', summary: next.summary } : { name: 'question', step: next });
    } catch (err) {
      handleFlowError(err, 'next');
    } finally {
      setIsBusy(false);
    }
  }, [code, handleFlowError]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const stored = loadAssignmentSession(code);
    if (stored) {
      tokenRef.current = stored.resumeToken;
      setPseudo(stored.pseudo);
      void loadNext();
    } else {
      setPhase({ name: 'pseudo' });
    }
  }, [code, loadNext]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePseudo(pseudo);
    setPseudoError(invalid);
    if (invalid) return;
    const value = pseudo.trim();
    setIsBusy(true);
    setNotice(null);
    try {
      const started = await startAssignment(code, value);
      tokenRef.current = started.resumeToken;
      saveAssignmentSession(code, { ...started, pseudo: value });
      setPseudo(value);
    } catch (err) {
      const error = getAssignmentError(err, 'start');
      setIsBusy(false);
      if (BLOCKING_KINDS.has(error.kind)) setPhase({ name: 'blocked', error });
      else setPseudoError(error.message);
      return;
    }
    await loadNext();
  };

  const handleSubmitAnswer = async () => {
    if (phase.name !== 'question' || submittingRef.current || !tokenRef.current) return;
    const step = phase.step;
    const answers = answersRef.current;
    submittingRef.current = true;
    setIsBusy(true);
    setInlineError(null);
    try {
      const result = await submitAssignmentAnswer(code, tokenRef.current, step.question.id, answers);
      setPhase({ name: 'feedback', step, result, answers });
    } catch (err) {
      const error = getAssignmentError(err, 'answer');
      if (error.kind === 'alreadyAnswered') {
        // Double soumission (autre onglet, réseau lent) : le serveur a déjà la réponse.
        await loadNext();
      } else {
        handleFlowError(err, 'answer');
      }
    } finally {
      submittingRef.current = false;
      setIsBusy(false);
    }
  };

  const retry = () => {
    if (tokenRef.current) void loadNext();
    else setPhase({ name: 'pseudo' });
  };

  let content: React.ReactNode = null;

  switch (phase.name) {
    case 'loading':
      content = (
        <p className="text-center text-ink-secondary" role="status">
          Chargement du devoir…
        </p>
      );
      break;

    case 'blocked':
      content = <BlockedScreen error={phase.error} onRetry={retry} />;
      break;

    case 'pseudo':
      content = (
        <Card tier="primary" className="max-w-md mx-auto p-8 space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-h2">Devoir à faire à ton rythme</h1>
            <p className="text-small text-ink-secondary">
              Code <span className="font-mono font-semibold">{code}</span>
            </p>
          </div>
          {notice && (
            <p className="rounded-md bg-warning-50 p-3 text-small text-ink" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={handleStart} noValidate className="space-y-4">
            <Input
              id="assignment-pseudo"
              name="pseudo"
              label="Ton pseudo"
              autoComplete="off"
              maxLength={NICKNAME_MAX_LENGTH}
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value);
                setPseudoError(null);
              }}
              error={pseudoError ?? undefined}
              autoFocus
            />
            <Button type="submit" className="w-full" isLoading={isBusy}>
              Commencer
            </Button>
          </form>
          <p className="text-caption text-ink-secondary text-center">
            Tu peux fermer cette page et revenir plus tard sur ce même appareil : ta progression est gardée.
          </p>
        </Card>
      );
      break;

    case 'question': {
      const { step } = phase;
      content = (
        <div className="space-y-4">
          <QuestionView
            key={step.question.id}
            // Le type attendu inclut `explanation` facultatif : la question du devoir n'en a pas.
            question={step.question as Omit<Question, 'correct_answers'>}
            questionNumber={step.questionNumber}
            totalQuestions={step.totalQuestions}
            timerSeconds={step.timerSeconds}
            onAnswer={(answers) => {
              answersRef.current = answers;
            }}
            onSubmit={handleSubmitAnswer}
            isSubmitting={isBusy}
            isAnswered={false}
          />
          {inlineError && (
            <div className="max-w-2xl mx-auto space-y-2 text-center">
              <p role="alert" className="text-small text-danger">
                {inlineError}
              </p>
              <Button variant="outline" size="sm" onClick={() => void handleSubmitAnswer()} disabled={isBusy}>
                Renvoyer ma réponse
              </Button>
            </div>
          )}
        </div>
      );
      break;
    }

    case 'feedback': {
      const { step, result, answers } = phase;
      const hasCorrection = result.correctAnswers.length > 0 || result.explanation !== null;
      const isLast = result.done || step.questionNumber >= step.totalQuestions;
      content = (
        <div className="max-w-md mx-auto space-y-5" data-testid="assignment-feedback">
          {result.isCorrect === null && !hasCorrection ? (
            <Card tier="primary" className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-primary" aria-hidden="true" />
              <h2 className="text-h3">Réponse enregistrée</h2>
              <p className="text-small text-ink-secondary">La correction sera affichée à la fin du devoir.</p>
            </Card>
          ) : (
            <AnswerFeedback
              result={
                result.isCorrect === null
                  ? null
                  : {
                      isCorrect: result.isCorrect,
                      pointsEarned: result.pointsEarned,
                      maxPoints: result.maxPoints,
                      timeTakenMs: result.timeTakenMs,
                      correctAnswers: result.correctAnswers,
                      yourAnswers: answers,
                      status: result.timedOut || answers.length === 0 ? 'timeout' : 'answered',
                    }
              }
              reveal={
                hasCorrection
                  ? {
                      questionId: step.question.id,
                      correctAnswers: result.correctAnswers,
                      explanation: result.explanation,
                      yourAnswers: answers,
                      isCorrect: result.isCorrect ?? sameAnswers(answers, result.correctAnswers),
                    }
                  : null
              }
              options={step.question.options}
              questionType={step.question.type}
            />
          )}
          {inlineError && (
            <p role="alert" className="text-small text-danger text-center">
              {inlineError}
            </p>
          )}
          <Button className="w-full" size="lg" onClick={() => void loadNext()} isLoading={isBusy}>
            {isLast ? 'Voir mon résultat' : 'Question suivante'}
          </Button>
        </div>
      );
      break;
    }

    case 'done':
      content = <DoneScreen summary={phase.summary} pseudo={pseudo} />;
      break;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      {dueAt && phase.name !== 'blocked' && phase.name !== 'done' && (
        <p className="max-w-2xl mx-auto mb-4 text-small text-ink-secondary text-center" data-testid="assignment-due">
          À terminer avant le {formatDueDate(dueAt)}
        </p>
      )}
      {content}
    </main>
  );
}
