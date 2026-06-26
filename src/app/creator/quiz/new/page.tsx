'use client';

import { useRouter } from 'next/navigation';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizForm } from '@/components/creator/QuizForm';

export default function NewQuizPage() {
  const router = useRouter();
  const { createQuiz, isLoading } = useQuiz();

  const handleSubmit = async (data: any) => {
    try {
      const quiz = await createQuiz(data);
      router.push(`/creator/quiz/${quiz.id}`);
    } catch (error) {
      console.error('Erreur création quiz:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Créer un nouveau quiz</h1>
        <QuizForm onSubmit={handleSubmit} isSubmitting={isLoading} />
      </div>
    </div>
  );
}