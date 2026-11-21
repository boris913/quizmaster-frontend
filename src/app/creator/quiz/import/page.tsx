'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuiz } from '@/hooks/useQuiz';
import { QuestionImporter } from '@/components/creator/QuestionImporter';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ImportQuizPage() {
  const t = useTranslations('importer');
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
        title: title || t('defaultTitle'),
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-h1">{t('pageTitle')}</h1>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium">{t('quizInfo')}</h3>
          <Input
            label={t('quizTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('quizTitlePlaceholder')}
          />
          <Input
            label={t('quizDescription')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-small">
              <input
                type="checkbox"
                checked={useGlobalTimer}
                onChange={(e) => setUseGlobalTimer(e.target.checked)}
                className="rounded border-borderc"
              />
              {t('globalTimer')}
            </label>
            {useGlobalTimer && (
              <Input
                label={t('seconds')}
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