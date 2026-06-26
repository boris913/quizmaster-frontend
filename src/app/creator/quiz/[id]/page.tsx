'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuiz } from '@/hooks/useQuiz';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Trash2, Plus, Play } from 'lucide-react';
import { CreateQuestionDto } from '@/types';

export default function QuizDetailPage() {
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
    if (confirm('Supprimer ce quiz définitivement ?')) {
      await deleteQuiz(quizId);
      router.push('/creator/dashboard');
    }
  };

  const handleCreateSession = () => {
    router.push(`/creator/session/new?quizId=${quizId}`);
  };

  if (isLoading || !currentQuiz) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
        <p className="text-neutral-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
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
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <p className="text-neutral-600">{currentQuiz.description || 'Aucune description'}</p>
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

          {currentQuiz.questions?.length === 0 ? (
            <p className="text-neutral-500">Aucune question</p>
          ) : (
            currentQuiz.questions?.map((q, index) => (
              <Card key={q.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-neutral-500">Q{index + 1}</span>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1 text-sm text-neutral-500">
                      <span>{q.type}</span>
                      <span>•</span>
                      <span>{q.max_points} pts</span>
                      <span>•</span>
                      <span>{q.timer_seconds}s</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.options.map((opt) => (
                        <span
                          key={opt.id}
                          className={`px-2 py-0.5 text-xs rounded ${
                            q.correct_answers.includes(opt.id)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-neutral-100 text-neutral-600'
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