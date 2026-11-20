'use client';

import { BarChart3, CheckCircle2, Lightbulb, XCircle, MinusCircle } from 'lucide-react';
import { AnswerResult } from '../ui/AnswerResult';
import { Card } from '../ui/Card';
import { cn } from '@/lib/utils';
import {
  answerLabel,
  inferQuestionType,
  type QuestionType,
  type QuizOption,
  type WsQuestionRevealPayload,
} from '@/types';

interface AnswerFeedbackProps {
  /** Résultat immédiat de la réponse (`answer:result`). Absent si le joueur n'a pas répondu. */
  result?: {
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    timeTakenMs: number;
    correctAnswers: string[];
    yourAnswers: string[];
    status: 'answered' | 'timeout' | 'skipped';
  } | null;
  /** Correction envoyée à la clôture de la question (`question:reveal`). */
  reveal?: WsQuestionRevealPayload | null;
  /** Options de la question, pour rappeler le texte des réponses. */
  options?: QuizOption[];
  /**
   * Type de la question (backend #7), facultatif. Sans lui, le type est déduit quand c'est
   * possible (options `true`/`false`, aucune option = réponse courte, correction vide =
   * sondage) ; seul l'affichage « remettre dans l'ordre » demande le type explicite.
   */
  questionType?: QuestionType | string;
}

function describe(ids: string[], options: QuizOption[] | undefined, type: QuestionType | null) {
  if (ids.length === 0) return '—';
  if (type === 'short_answer') return ids.join(' / ');
  if (type === 'true_false') return ids.map((id) => answerLabel(id, options)).join(', ');
  if (type === 'ordering') {
    return ids.map((id, i) => `${i + 1}. ${answerLabel(id, options)}`).join(' → ');
  }
  return ids
    .map((id) => {
      const text = options?.find((o) => o.id === id)?.text;
      return text ? `${id}. ${text}` : id;
    })
    .join(', ');
}

/** Retour d'un sondage : ni verdict, ni points ; simple accusé de réception du vote. */
function PollFeedback({ yourAnswers, options }: { yourAnswers: string[]; options?: QuizOption[] }) {
  const voted = yourAnswers.length > 0;
  return (
    <Card tier="primary" className="p-6 text-center space-y-2" data-testid="poll-feedback" aria-live="polite">
      <BarChart3 className="w-10 h-10 mx-auto text-primary" aria-hidden />
      <h3 className="text-h3">{voted ? 'Vote enregistré' : 'Pas de vote'}</h3>
      {voted && (
        <p className="text-small text-ink-secondary">
          Votre choix : <span className="font-medium text-ink">{describe(yourAnswers, options, 'poll')}</span>
        </p>
      )}
      <p className="text-caption text-ink-secondary">Sondage : pas de bonne réponse, aucun point en jeu.</p>
    </Card>
  );
}

export function AnswerFeedback({ result, reveal, options, questionType }: AnswerFeedbackProps) {
  // Type : prop, sinon celui de `question:reveal` (backend #7), sinon déduit.
  const type = reveal?.graded === false ? 'poll' : inferQuestionType({
    type: questionType ?? reveal?.type ?? undefined,
    options,
    correctAnswers: reveal ? reveal.correctAnswers : null,
  });
  const answered = reveal ? reveal.yourAnswers.length > 0 : true;

  if (type === 'poll') {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <PollFeedback yourAnswers={reveal?.yourAnswers ?? result?.yourAnswers ?? []} options={options} />
        {reveal?.explanation && (
          <div className="rounded-md bg-primary-50 p-3 text-small" data-testid="answer-explanation">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <Lightbulb className="w-4 h-4" aria-hidden />
              Explication
            </p>
            <p className="mt-1 whitespace-pre-line text-ink">{reveal.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  const correctLabel =
    type === 'short_answer'
      ? reveal && reveal.correctAnswers.length > 1
        ? 'Réponses acceptées :'
        : 'Réponse attendue :'
      : type === 'ordering'
        ? 'Ordre attendu :'
        : reveal && reveal.correctAnswers.length > 1
          ? 'Bonnes réponses :'
          : 'Bonne réponse :';

  return (
    <div className="max-w-md mx-auto space-y-4">
      {result && (
        <AnswerResult
          {...result}
          // La correction (si reçue) fait foi ; on évite d'afficher le rappel en double.
          isCorrect={reveal ? reveal.isCorrect : result.isCorrect}
          showRecap={!reveal}
          correctAnswers={type === 'true_false' ? result.correctAnswers.map((id) => answerLabel(id, options)) : result.correctAnswers}
          yourAnswers={type === 'true_false' ? result.yourAnswers.map((id) => answerLabel(id, options)) : result.yourAnswers}
        />
      )}

      {reveal && (
        <Card
          tier="primary"
          className="p-5 space-y-3"
          role="region"
          aria-labelledby="reveal-title"
          aria-live="polite"
          data-testid="answer-reveal"
        >
          <h3
            id="reveal-title"
            className={cn(
              'flex items-center gap-2 text-h3',
              !answered ? 'text-ink-secondary' : reveal.isCorrect ? 'text-success' : 'text-danger'
            )}
          >
            {!answered ? (
              <MinusCircle className="w-6 h-6" aria-hidden />
            ) : reveal.isCorrect ? (
              <CheckCircle2 className="w-6 h-6" aria-hidden />
            ) : (
              <XCircle className="w-6 h-6" aria-hidden />
            )}
            {!answered ? 'Pas de réponse' : reveal.isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
          </h3>

          <dl className="text-small space-y-1">
            <div className="flex gap-2">
              <dt className="text-ink-secondary shrink-0">Votre réponse :</dt>
              <dd className="font-medium text-ink">{describe(reveal.yourAnswers, options, type)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-secondary shrink-0">{correctLabel}</dt>
              <dd className="font-medium text-success">{describe(reveal.correctAnswers, options, type)}</dd>
            </div>
          </dl>

          {reveal.explanation && (
            <div className="rounded-md bg-primary-50 p-3 text-small" data-testid="answer-explanation">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <Lightbulb className="w-4 h-4" aria-hidden />
                Explication
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{reveal.explanation}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
