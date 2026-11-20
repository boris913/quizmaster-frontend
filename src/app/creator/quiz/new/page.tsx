'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizForm, type QuizFormSubmitData } from '@/components/creator/QuizForm';
import { resolvePendingQuestionImages } from '@/lib/questionImage';

export default function NewQuizPage() {
  const router = useRouter();
  const { createQuiz, addQuestions, isLoading } = useQuiz();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: QuizFormSubmitData) => {
    setSaving(true);
    setError(null);
    try {
      const { questions, ...quizData } = data;
      if (!questions.some((q) => q.image_file)) {
        const quiz = await createQuiz({ ...quizData, questions });
        router.push(`/creator/quiz/${quiz.id}`);
        return;
      }
      // Images choisies avant la création : l'URL signée exige l'id du quiz. On crée donc le
      // quiz, on téléverse les images, puis on ajoute les questions avec leur `image_url`.
      const quiz = await createQuiz({ ...quizData, questions: [] });
      const resolved = await resolvePendingQuestionImages(quiz.id, questions);
      await addQuestions(quiz.id, resolved.questions);
      if (resolved.failures.length > 0) {
        window.alert(
          `Quiz créé, mais l'image n'a pas pu être envoyée pour : ${resolved.failures
            .map((i) => `question ${i + 1}`)
            .join(', ')}.`
        );
      }
      router.push(`/creator/quiz/${quiz.id}`);
    } catch (e) {
      console.error('Erreur création quiz:', e);
      setError("Le quiz n'a pas pu être enregistré. Vérifiez les champs puis réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Créer un nouveau quiz</h1>
        {error && (
          <p role="alert" className="mb-4 rounded-md bg-danger-50 p-3 text-small text-danger">
            {error}
          </p>
        )}
        <QuizForm onSubmit={handleSubmit} isSubmitting={isLoading || saving} />
      </div>
    </div>
  );
}
