'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileUp, PenLine, Sparkles } from 'lucide-react';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizForm, type QuizFormSubmitData } from '@/components/creator/QuizForm';
import { AiQuizGenerator } from '@/components/creator/AiQuizGenerator';
import { Button } from '@/components/ui/Button';
import { resolvePendingQuestionImages } from '@/lib/questionImage';
import { fetchGenerationQuota, type GenerationQuota, type GenerationResult } from '@/lib/aiGeneration';
import { cn } from '@/lib/utils';

type Mode = 'manual' | 'ai';

const AI_DRAFT_BANNER = 'Brouillon généré par IA — à vérifier avant utilisation';
const LEAVE_CONFIRMATION = 'Le brouillon généré n’est pas enregistré. Quitter quand même ?';

interface AiDraft {
  id: number;
  result: GenerationResult;
}

export default function NewQuizPage() {
  const router = useRouter();
  const { createQuiz, addQuestions, isLoading } = useQuiz();
  const [mode, setMode] = useState<Mode>('manual');
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [quota, setQuota] = useState<GenerationQuota | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Vrai une fois le quiz enregistré : la navigation qui suit ne doit plus être bloquée. */
  const saved = useRef(false);

  // Quota affiché sous le bouton de génération dès l'ouverture de l'onglet (silencieux si indisponible).
  useEffect(() => {
    if (mode !== 'ai' || quota) return;
    let cancelled = false;
    fetchGenerationQuota().then((q) => {
      if (!cancelled && q) setQuota((current) => current ?? q);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, quota]);

  // Brouillon IA non enregistré : confirmation avant de fermer ou recharger l'onglet.
  useEffect(() => {
    if (!draft) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saved.current) return;
      event.preventDefault();
      event.returnValue = LEAVE_CONFIRMATION;
      return LEAVE_CONFIRMATION;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [draft]);

  const handleSubmit = async (data: QuizFormSubmitData) => {
    setSaving(true);
    setError(null);
    try {
      const { questions, ...quizData } = data;
      if (!questions.some((q) => q.image_file)) {
        const quiz = await createQuiz({ ...quizData, questions });
        saved.current = true;
        router.push(`/creator/quiz/${quiz.id}`);
        return;
      }
      // Images choisies avant la création : l'URL signée exige l'id du quiz. On crée donc le
      // quiz, on téléverse les images, puis on ajoute les questions avec leur `image_url`.
      const quiz = await createQuiz({ ...quizData, questions: [] });
      saved.current = true;
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

  const onGenerated = (result: GenerationResult) => {
    saved.current = false;
    setError(null);
    if (result.quota) setQuota(result.quota);
    setDraft((previous) => ({ id: (previous?.id ?? 0) + 1, result }));
  };

  const discardDraft = () => {
    if (!window.confirm('Abandonner ce brouillon ? Les questions générées seront perdues.')) return;
    setDraft(null);
  };

  const selectMode = (next: Mode) => {
    if (next === mode) return;
    if (draft && !window.confirm(LEAVE_CONFIRMATION)) return;
    setDraft(null);
    setError(null);
    setMode(next);
  };

  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-md px-4 py-2 text-small font-medium min-h-[44px] transition-colors',
      active ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-black/[0.04] hover:text-ink'
    );

  const discarded = draft?.result.discarded ?? 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Créer un nouveau quiz</h1>

        <div role="tablist" aria-label="Mode de création" className="mb-6 flex flex-wrap gap-2 border-b border-borderc pb-3">
          <button type="button" role="tab" aria-selected={mode === 'manual'} className={tabClass(mode === 'manual')} onClick={() => selectMode('manual')}>
            <PenLine className="w-4 h-4" aria-hidden /> Création manuelle
          </button>
          <button type="button" role="tab" aria-selected={mode === 'ai'} className={tabClass(mode === 'ai')} onClick={() => selectMode('ai')}>
            <Sparkles className="w-4 h-4" aria-hidden /> Générer depuis un cours
          </button>
          <Link href="/creator/quiz/import" className={tabClass(false)}>
            <FileUp className="w-4 h-4" aria-hidden /> Importer un fichier
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-md bg-danger-50 p-3 text-small text-danger">
            {error}
          </p>
        )}

        {mode === 'manual' && <QuizForm onSubmit={handleSubmit} isSubmitting={isLoading || saving} />}

        {mode === 'ai' && !draft && <AiQuizGenerator onGenerated={onGenerated} quota={quota} />}

        {mode === 'ai' && draft && (
          <div className="space-y-6">
            <div
              role="note"
              data-testid="ai-draft-banner"
              className="flex gap-3 rounded-lg border border-warning bg-warning-50 p-4 text-ink"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-warning" aria-hidden />
              <div className="space-y-1 text-small">
                <p className="font-semibold">{AI_DRAFT_BANNER}</p>
                <p>
                  {draft.result.questions.length} question{draft.result.questions.length > 1 ? 's' : ''} générée
                  {draft.result.questions.length > 1 ? 's' : ''}. Relisez chaque énoncé, les bonnes réponses et les
                  explications : l’IA peut se tromper. Rien n’est enregistré tant que vous ne cliquez pas sur
                  « Enregistrer le quiz ».
                </p>
                {draft.result.truncated && (
                  <p data-testid="ai-truncated">
                    Le cours était long : seul son début a été utilisé pour générer les questions.
                  </p>
                )}
                {discarded > 0 && (
                  <p data-testid="ai-discarded">
                    {discarded} question{discarded > 1 ? 's ont été écartées' : ' a été écartée'} car invalide
                    {discarded > 1 ? 's' : ''} (réponse incohérente ou incomplète).
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={discardDraft}>
                Abandonner et recommencer
              </Button>
            </div>

            <QuizForm
              key={draft.id}
              initialData={{ title: draft.result.title ?? '', questions: draft.result.questions }}
              onSubmit={handleSubmit}
              isSubmitting={isLoading || saving}
              submitLabel="Enregistrer le quiz"
            />
          </div>
        )}
      </div>
    </div>
  );
}
