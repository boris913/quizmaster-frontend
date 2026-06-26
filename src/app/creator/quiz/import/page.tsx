'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/hooks/useQuiz';
import { QuestionImporter } from '@/components/creator/QuestionImporter';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ImportQuizPage() {
  const router = useRouter();
  const { createQuiz, importQuestions, isLoading } = useQuiz();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [globalTimer, setGlobalTimer] = useState(30);
  const [useGlobalTimer, setUseGlobalTimer] = useState(true);
  const [importing, setImporting] = useState(false);

  const handleImport = async (questionsContent: string, answersContent?: string) => {
    setImporting(true);
    try {
      // Créer d'abord le quiz
      const quiz = await createQuiz({
        title: title || 'Quiz importé',
        description,
        global_timer_seconds: globalTimer,
        use_global_timer: useGlobalTimer,
        questions: [],
      });
      // Importer les questions
      await importQuestions(quiz.id, questionsContent, answersContent);
      router.push(`/creator/quiz/${quiz.id}`);
    } catch (error) {
      console.error('Erreur import:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Importer un quiz</h1>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium">Informations du quiz</h3>
          <Input
            label="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du quiz"
          />
          <Input
            label="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useGlobalTimer}
                onChange={(e) => setUseGlobalTimer(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Timer global
            </label>
            {useGlobalTimer && (
              <Input
                label="Secondes"
                type="number"
                value={globalTimer}
                onChange={(e) => setGlobalTimer(Number(e.target.value))}
                className="w-24"
              />
            )}
          </div>
        </Card>

        <QuestionImporter
          onImport={handleImport}
          isImporting={importing || isLoading}
        />
      </div>
    </div>
  );
}