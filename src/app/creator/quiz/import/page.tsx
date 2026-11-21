'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/hooks/useQuiz';
import { QuestionImporter } from '@/components/creator/QuestionImporter';
import { FileQuizImporter } from '@/components/creator/FileQuizImporter';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useQuizStore } from '@/store/quizStore';
import { deleteDraftQuiz, deleteDraftQuizOnPageHide } from '@/lib/quizSharing';

type ImportTab = 'markdown' | 'spreadsheet' | 'kahoot';

const TABS: { id: ImportTab; label: string }[] = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'spreadsheet', label: 'Tableur (CSV / XLSX)' },
  { id: 'kahoot', label: 'Kahoot (XLSX)' },
];

export default function ImportQuizPage() {
  const router = useRouter();
  const { createQuiz, importQuestions, isLoading } = useQuiz();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [globalTimer, setGlobalTimer] = useState(30);
  const [useGlobalTimer, setUseGlobalTimer] = useState(true);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<ImportTab>('markdown');
  // Quiz cible des imports tableur / Kahoot : créé au premier aperçu, réutilisé pour l'import
  // réel, et supprimé (au mieux) s'il n'a finalement rien reçu : annulation, import sans
  // question, changement de page ou fermeture de l'onglet.
  const draft = useRef<{ promise: Promise<string> | null; id: string | null }>({ promise: null, id: null });
  const draftKept = useRef(false);

  const getFileQuizId = (): Promise<string> => {
    if (draft.current.promise) return draft.current.promise;
    const promise: Promise<string> = createQuiz({
      title: title || 'Quiz importé',
      description,
      global_timer_seconds: globalTimer,
      use_global_timer: useGlobalTimer,
      questions: [],
    }).then((quiz) => {
      if (draft.current.promise === promise) draft.current.id = quiz.id;
      return quiz.id;
    });
    draft.current = { promise, id: null };
    promise.catch(() => {
      if (draft.current.promise === promise) draft.current = { promise: null, id: null };
    });
    return promise;
  };

  const discardDraft = useCallback(() => {
    const { promise } = draft.current;
    draft.current = { promise: null, id: null };
    if (!promise || draftKept.current) return;
    promise.then(
      async (id) => {
        await deleteDraftQuiz(id);
        useQuizStore.setState((state) => ({ quizzes: state.quizzes.filter((q) => q.id !== id) }));
      },
      () => undefined
    );
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      const { id } = draft.current;
      if (!id || draftKept.current) return;
      draft.current = { promise: null, id: null };
      deleteDraftQuizOnPageHide(id, useAuthStore.getState().token);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      // Navigation dans l'application : la page est démontée sans import confirmé.
      discardDraft();
    };
  }, [discardDraft]);

  const handleFileImported = (quizId: string) => {
    draftKept.current = true;
    router.push(`/creator/quiz/${quizId}`);
  };

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
    <div className="min-h-screen bg-background p-6">
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
                className="rounded border-borderc"
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

        <div role="tablist" aria-label="Format d’import" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`import-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`import-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`min-h-[44px] rounded-md px-4 text-small font-medium transition-colors ${
                tab === t.id ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-black/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`import-panel-${tab}`} aria-labelledby={`import-tab-${tab}`}>
          {tab === 'markdown' ? (
            <QuestionImporter
              onImport={handleImport}
              isImporting={importing || isLoading}
            />
          ) : (
            <FileQuizImporter
              key={tab}
              source={tab}
              getQuizId={getFileQuizId}
              onImported={handleFileImported}
              onDiscard={discardDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
}