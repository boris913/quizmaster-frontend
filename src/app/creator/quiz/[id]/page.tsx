'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuiz } from '@/hooks/useQuiz';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Trash2, Plus, Play } from 'lucide-react';

export default function QuizDetailPage() {
  const t = useTranslations('quizDetail');
  const tc = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const { currentQuiz, fetchQuiz, deleteQuiz, isLoading } = useQuiz();
  const [showAddQuestion, setShowAddQuestion] = useState(false);

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

  if (isLoading || !currentQuiz) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">{tc('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
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
          <Button variant="danger" size="sm" onClick={handleDelete} aria-label={t('deleteAria')} title={t('deleteAria')}>
            <Trash2 className="w-4 h-4" aria-hidden />
          </Button>
        </div>

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

          {currentQuiz.questions?.length === 0 ? (
            <p className="text-ink-secondary">{t('noQuestions')}</p>
          ) : (
            currentQuiz.questions?.map((q, index) => (
              <Card key={q.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-small text-ink-secondary">{t('questionShort', { number: index + 1 })}</span>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1 text-small text-ink-secondary">
                      <span>{t(`type.${q.type}`)}</span>
                      <span>•</span>
                      <span>{tc('pointsCount', { count: q.max_points })}</span>
                      <span>•</span>
                      <span>{t('seconds', { seconds: q.timer_seconds })}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.options.map((opt) => (
                        <span
                          key={opt.id}
                          className={`px-2 py-0.5 text-caption rounded-sm ${
                            q.correct_answers.includes(opt.id)
                              ? 'bg-success-50 text-success'
                              : 'bg-ink/[0.05] text-ink-secondary'
                          }`}
                        >
                          {opt.id}: {opt.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}