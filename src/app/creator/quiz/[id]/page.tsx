'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAnswerLabels } from '@/i18n/answerLabel';
import { useQuiz } from '@/hooks/useQuiz';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddQuestionsForm } from '@/components/creator/AddQuestionsForm';
import { QuestionImage } from '@/components/ui/QuestionImage';
import { ArrowLeft, Trash2, Plus, Play, CalendarClock, Copy, Share2, X } from 'lucide-react';
import { AssignHomeworkDialog } from '@/components/creator/AssignHomeworkDialog';
import { ShareQuizPanel } from '@/components/creator/ShareQuizPanel';
import {
  copiedQuizPath,
  copyWarningLabel,
  duplicateErrorMessage,
  duplicateQuiz,
  readShareToken,
  rememberCopyWarnings,
  takeCopyWarnings,
  type CopyWarning,
} from '@/lib/quizSharing';
import {
  normalizeQuestionType,
  type Question,
  type QuestionPayload,
} from '@/types';

/** Rappel des réponses d'une question selon son type. */
function QuestionAnswers({ question }: { question: Question }) {
  const t = useTranslations('quizDetail');
  const { answerLabel, optionText } = useAnswerLabels();
  const type = normalizeQuestionType(question.type);
  const chip = (key: string, label: string, correct: boolean) => (
    <span
      key={key}
      className={`px-2 py-0.5 text-caption rounded-sm ${
        correct ? 'bg-success-50 text-success' : 'bg-ink/[0.05] text-ink-secondary'
      }`}
    >
      {label}
    </span>
  );
  const correct = question.correct_answers ?? [];
  if (type === 'short_answer') {
    return (
      <div className="flex flex-wrap gap-1 mt-1" aria-label={t('acceptedAria')}>
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
      <ol className="flex flex-wrap gap-1 mt-1" aria-label={t('orderAria')}>
        {ids.map((id, i) => (
          <li key={id}>{chip(id, `${i + 1}. ${answerLabel(id, question.options)}`, true)}</li>
        ))}
      </ol>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {question.options.map((opt) =>
        chip(opt.id, `${opt.id}: ${optionText(opt.text)}`, type !== 'poll' && correct.includes(opt.id))
      )}
    </div>
  );
}

export default function QuizDetailPage() {
  const t = useTranslations('quizDetail');
  const tc = useTranslations('common');
  const tq = useTranslations('questionTypes');
  const ts = useTranslations('sharing');
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
      setAddError(t('addError'));
    } finally {
      setIsAdding(false);
    }
  };
  const [showAssign, setShowAssign] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  // Avertissements d'une duplication ou d'une copie qui vient d'ouvrir cette page.
  const [copyWarnings, setCopyWarnings] = useState<CopyWarning[]>([]);
  useEffect(() => {
    if (quizId) setCopyWarnings(takeCopyWarnings(quizId));
  }, [quizId]);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    setDuplicateError(null);
    try {
      const copy = await duplicateQuiz(quizId);
      rememberCopyWarnings(copy);
      router.push(copiedQuizPath(copy));
    } catch (e) {
      setDuplicateError(duplicateErrorMessage(e, ts));
    } finally {
      setIsDuplicating(false);
    }
  };

  useEffect(() => {
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, [quizId]);

  const handleDelete = async () => {
    if (confirm(t('confirmDelete'))) {
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
        <p className="text-ink-secondary">{tc('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/creator/dashboard">
              <ArrowLeft className="w-4 h-4" />
              {tc('back')}
            </Link>
          </Button>
          <h1 className="text-h2 flex-1">{currentQuiz.title}</h1>
          <Button variant="outline" size="sm" onClick={handleCreateSession}>
            <Play className="w-4 h-4" />
            {t('startSession')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAssign(true)}>
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
            {t('assign')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} isLoading={isDuplicating}>
            <Copy className="w-4 h-4" aria-hidden="true" />
            {ts('duplicate')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare((v) => !v)} aria-expanded={showShare}>
            <Share2 className="w-4 h-4" aria-hidden="true" />
            {ts('share')}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} aria-label={t('deleteAria')} title={t('deleteAria')}>
            <Trash2 className="w-4 h-4" aria-hidden />
          </Button>
        </div>

        {duplicateError && (
          <p role="alert" className="mb-6 rounded-md bg-danger-50 p-3 text-small text-danger">
            {duplicateError}
          </p>
        )}

        {copyWarnings.length > 0 && (
          <div
            role="status"
            data-testid="copy-warnings"
            className="mb-6 flex items-start justify-between gap-3 rounded-md border border-warning-100 bg-warning-50 p-3 text-small text-ink"
          >
            <div className="space-y-1">
              <p className="font-medium">{ts('copyWarningsTitle', { count: copyWarnings.length })}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {copyWarnings.map((w, i) => (
                  <li key={i}>{copyWarningLabel(w, ts)}</li>
                ))}
              </ul>
              <p className="text-ink-secondary">{ts('copyWarningsHint')}</p>
            </div>
            <button
              type="button"
              onClick={() => setCopyWarnings([])}
              aria-label={ts('copyWarningsDismiss')}
              className="shrink-0 text-ink-secondary hover:text-ink"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {showShare && (
          <ShareQuizPanel
            quizId={quizId}
            initialToken={readShareToken(currentQuiz)}
            onClose={() => setShowShare(false)}
          />
        )}

        {showAssign && (
          <AssignHomeworkDialog
            quizId={quizId}
            quizTitle={currentQuiz.title}
            onClose={() => setShowAssign(false)}
          />
        )}

        <Card className="p-6 mb-6">
          <p className="text-ink-secondary">{currentQuiz.description || t('noDescription')}</p>
          <div className="flex gap-4 mt-3 text-small">
            <span>{t.rich('questionsCount', { count: currentQuiz.total_questions, b: (chunks) => <strong>{chunks}</strong> })}</span>
            <span>
              {currentQuiz.use_global_timer
                ? t('timerGlobal', { seconds: currentQuiz.global_timer_seconds })
                : t('timerPerQuestion')}
            </span>
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-h3">{t('questions')}</h2>
            <Button size="sm" onClick={() => setShowAddQuestion(!showAddQuestion)}>
              <Plus className="w-4 h-4" />
              {t('add')}
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
            <p className="text-ink-secondary">{t('noQuestions')}</p>
          ) : (
            currentQuiz.questions?.map((q, index) => (
              <Card key={q.id} className="p-4" data-testid="quiz-question">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <span className="text-small text-ink-secondary">{t('questionShort', { number: index + 1 })}</span>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1 text-small text-ink-secondary">
                      <span>{tq(normalizeQuestionType(q.type))}</span>
                      <span>•</span>
                      <span>
                        {normalizeQuestionType(q.type) === 'poll'
                          ? t('notGraded')
                          : tc('pointsCount', { count: q.max_points })}
                      </span>
                      <span>•</span>
                      <span>{t('seconds', { seconds: q.timer_seconds })}</span>
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