'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizForm } from '@/components/creator/QuizForm';

export default function NewQuizPage() {
  const t = useTranslations('newQuiz');
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-h1 mb-6">{t('title')}</h1>
        <QuizForm onSubmit={handleSubmit} isSubmitting={isLoading} />
      </div>
    </div>
  );
}