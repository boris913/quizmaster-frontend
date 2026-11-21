'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuestionImage } from '@/components/ui/QuestionImage';
import { useAuthStore } from '@/store/authStore';
import { LinkIcon, Plus } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@/types';
import {
  copiedQuizPath,
  copySharedQuiz,
  rememberCopyWarnings,
  countQuestionTypes,
  fetchSharedQuiz,
  httpStatus,
  isInvalidShareTokenError,
  loginUrlWithReturn,
  serverMessage,
  type SharedQuizPreview,
} from '@/lib/quizSharing';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; quiz: SharedQuizPreview }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

/**
 * Aperçu public d'un quiz partagé par un collègue (sans les bonnes réponses) et copie dans
 * son propre compte. Non connecté : « Ajouter à mes quiz » renvoie vers la connexion, puis ici.
 */
export default function SharedQuizPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token ?? '');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', quiz: await fetchSharedQuiz(token) });
    } catch (e) {
      if (isInvalidShareTokenError(e)) setState({ kind: 'invalid' });
      else
        setState({
          kind: 'error',
          message:
            httpStatus(e) === null
              ? 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
              : serverMessage(e) ?? 'L’aperçu n’a pas pu être chargé. Réessayez.',
        });
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const goToLogin = () => router.push(loginUrlWithReturn(`/creator/quiz/shared/${encodeURIComponent(token)}`));

  const handleCopy = async () => {
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    setCopying(true);
    setCopyError(null);
    try {
      const copy = await copySharedQuiz(token);
      rememberCopyWarnings(copy);
      router.push(copiedQuizPath(copy));
    } catch (e) {
      if (httpStatus(e) === 401) goToLogin();
      else if (isInvalidShareTokenError(e)) setState({ kind: 'invalid' });
      else setCopyError(serverMessage(e) ?? 'La copie n’a pas pu être créée. Réessayez.');
      setCopying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {state.kind === 'loading' && <p className="text-ink-secondary">Chargement de l’aperçu…</p>}

        {state.kind === 'invalid' && (
          <Card className="p-6 space-y-3" role="alert" data-testid="shared-invalid">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LinkIcon className="w-5 h-5" aria-hidden="true" />
              Lien de partage invalide
            </h1>
            <p className="text-ink-secondary">
              Ce lien n’existe pas ou a été révoqué par son auteur. Demandez-lui un nouveau lien.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/creator/dashboard">Aller à mes quiz</Link>
            </Button>
          </Card>
        )}

        {state.kind === 'error' && (
          <Card className="p-6 space-y-3">
            <p role="alert" className="text-danger">
              {state.message}
            </p>
            <Button variant="outline" size="sm" onClick={load}>
              Réessayer
            </Button>
          </Card>
        )}

        {state.kind === 'ready' && (
          <>
            <Card className="p-6 space-y-4">
              <p className="text-caption font-medium text-primary">Quiz partagé avec vous</p>
              <h1 className="text-3xl font-bold">{state.quiz.title}</h1>
              {state.quiz.authorPseudo && (
                <p className="text-small text-ink-secondary">Par {state.quiz.authorPseudo}</p>
              )}
              {state.quiz.description && <p className="text-ink-secondary">{state.quiz.description}</p>}
              <div className="flex flex-wrap gap-2 text-small" data-testid="shared-summary">
                <span className="font-semibold">
                  {state.quiz.questionCount} question{state.quiz.questionCount > 1 ? 's' : ''}
                </span>
                {countQuestionTypes(state.quiz.questions).map(([type, count]) => (
                  <span key={type} className="rounded bg-black/[0.05] px-2 py-0.5 text-ink-secondary">
                    {QUESTION_TYPE_LABELS[type]} × {count}
                  </span>
                ))}
              </div>
              <p className="text-small text-ink-secondary">
                Vous recevez une copie modifiable dans vos quiz ; le quiz d’origine n’est jamais modifié.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCopy} isLoading={copying}>
                  <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                  Ajouter à mes quiz
                </Button>
                {!isAuthenticated && (
                  <span className="text-small text-ink-secondary">
                    Vous devrez vous connecter (ou créer un compte) pour l’ajouter.
                  </span>
                )}
              </div>
              {copyError && (
                <p role="alert" className="rounded-md bg-danger-50 p-3 text-small text-danger">
                  {copyError}
                </p>
              )}
            </Card>

            <section aria-label="Questions du quiz" className="space-y-3">
              {state.quiz.questions.map((q, index) => (
                <Card key={index} className="p-4" data-testid="shared-question">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-ink-secondary">
                        Q{index + 1} · {QUESTION_TYPE_LABELS[q.type]}
                      </span>
                      <p className="font-medium">{q.text}</p>
                      {q.options.length > 0 && q.type !== 'true_false' && (
                        <ul className="flex flex-wrap gap-1 mt-1">
                          {q.options.map((o) => (
                            <li
                              key={o.id}
                              className="px-2 py-0.5 text-xs rounded bg-black/[0.05] text-ink-secondary"
                            >
                              {o.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {q.imageUrl && (
                      <QuestionImage src={q.imageUrl} questionText={q.text} className="max-h-28 sm:w-40" />
                    )}
                  </div>
                </Card>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
