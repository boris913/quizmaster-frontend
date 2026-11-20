'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuiz } from '@/hooks/useQuiz';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddQuestionsForm } from '@/components/creator/AddQuestionsForm';
import { QuestionImage } from '@/components/ui/QuestionImage';
import { ArrowLeft, Trash2, Plus, Play, CalendarClock } from 'lucide-react';
import { AssignHomeworkDialog } from '@/components/creator/AssignHomeworkDialog';
import {
  QUESTION_TYPE_LABELS,
  answerLabel,
  normalizeQuestionType,
  type Question,
  type QuestionPayload,
} from '@/types';

/** Rappel des réponses d'une question selon son type. */
function QuestionAnswers({ question }: { question: Question }) {
  const type = normalizeQuestionType(question.type);
  const chip = (key: string, label: string, correct: boolean) => (
    <span
      key={key}
      className={`px-2 py-0.5 text-xs rounded ${
        correct ? 'bg-success-50 text-success' : 'bg-ink/[0.05] text-ink-secondary'
      }`}
    >
      {label}
    </span>
  );
  const correct = question.correct_answers ?? [];
  if (type === 'short_answer') {
    return (
      <div className="flex flex-wrap gap-1 mt-1" aria-label="Réponses acceptées">
        {correct.map((v) => chip(v, v, true))}
      </div>
    );
  }
  if (type === 'true_false') {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {['true', 'false'].map((id) => chip(id, answerLabel(id, question.options), correct.includes(id)))}
      </div>
    );
  }
  if (type === 'ordering') {
    const ids = correct.length ? correct : question.options.map((o) => o.id);
    return (
      <ol className="flex flex-wrap gap-1 mt-1" aria-label="Ordre attendu">
        {ids.map((id, i) => (
          <li key={id}>{chip(id, `${i + 1}. ${answerLabel(id, question.options)}`, true)}</li>
        ))}
      </ol>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {question.options.map((opt) =>
        chip(opt.id, `${opt.id}: ${opt.text}`, type !== 'poll' && correct.includes(opt.id))
      )}
    </div>
  );
}

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const { currentQuiz, fetchQuiz, deleteQuiz, addQuestions } = useQuiz();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddQuestions = async (questions: QuestionPayload[]) => {
    setIsAdding(true);
    setAddError(null);
    try {
      await addQuestions(quizId, questions);
      setShowAddQuestion(false);
    } catch (e) {
      console.error('Erreur ajout de questions:', e);
      setAddError("Les questions n'ont pas pu être enregistrées. Réessayez.");
    } finally {
      setIsAdding(false);
    }
  };
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, [quizId]);

  const handleDelete = async () => {
    if (confirm('Supprimer ce quiz définitivement ?')) {
      await deleteQuiz(quizId);
      router.push('/creator/dashboard');
    }
  };

  const handleCreateSession = () => {
    router.push(`/creator/session/new?quizId=${quizId}`);
  };

  if (!currentQuiz || currentQuiz.id !== quizId) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/creator/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex-1">{currentQuiz.title}</h1>
          <Button variant="outline" size="sm" onClick={handleCreateSession}>
            <Play className="w-4 h-4 mr-1" />
            Lancer une session
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAssign(true)}>
            <CalendarClock className="w-4 h-4 mr-1" aria-hidden="true" />
            Assigner en devoir
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {showAssign && (
          <AssignHomeworkDialog
            quizId={quizId}
            quizTitle={currentQuiz.title}
            onClose={() => setShowAssign(false)}
          />
        )}

        <Card className="p-6 mb-6">
          <p className="text-ink-secondary">{currentQuiz.description || 'Aucune description'}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span><strong>{currentQuiz.total_questions}</strong> questions</span>
            <span>Timer {currentQuiz.use_global_timer ? 'global' : 'par question'}</span>
            {currentQuiz.use_global_timer && (
              <span>{currentQuiz.global_timer_seconds}s</span>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Questions</h2>
            <Button size="sm" onClick={() => setShowAddQuestion(!showAddQuestion)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {showAddQuestion && (
            <div className="space-y-2">
              {addError && (
                <p role="alert" className="rounded-md bg-danger-50 p-3 text-small text-danger">
                  {addError}
                </p>
              )}
              <AddQuestionsForm
                quizId={quizId}
                useGlobalTimer={currentQuiz.use_global_timer}
                globalTimer={currentQuiz.global_timer_seconds}
                onSubmit={handleAddQuestions}
                onCancel={() => setShowAddQuestion(false)}
                isSubmitting={isAdding}
              />
            </div>
          )}

          {currentQuiz.questions?.length === 0 ? (
            <p className="text-ink-secondary">Aucune question</p>
          ) : (
            currentQuiz.questions?.map((q, index) => (
              <Card key={q.id} className="p-4" data-testid="quiz-question">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-ink-secondary">Q{index + 1}</span>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1 text-sm text-ink-secondary">
                      <span>{QUESTION_TYPE_LABELS[normalizeQuestionType(q.type)]}</span>
                      <span>•</span>
                      <span>{normalizeQuestionType(q.type) === 'poll' ? 'non noté' : `${q.max_points} pts`}</span>
                      <span>•</span>
                      <span>{q.timer_seconds}s</span>
                    </div>
                    <QuestionAnswers question={q} />
                  </div>
                  {q.image_url && (
                    <QuestionImage src={q.image_url} questionText={q.text} className="max-h-28 sm:w-40" />
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}