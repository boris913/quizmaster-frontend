'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuiz } from '@/hooks/useQuiz';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Copy, Check } from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');
  const { currentQuiz, fetchQuiz, isLoading: quizLoading } = useQuiz();
  const { createSession, isLoading: sessionLoading } = useSession();
  const [created, setCreated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, [quizId]);

  const handleCreate = async () => {
    if (!quizId) return;
    try {
      const s = await createSession(quizId);
      setSession(s);
      setCreated(true);
    } catch (error) {
      console.error('Erreur création session:', error);
    }
  };

  const handleCopyPassword = () => {
    if (session?.password) {
      navigator.clipboard.writeText(session.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-ink-secondary">Chargement...</p>
      </div>
    );
  }

  if (!quizId || !currentQuiz) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <p className="text-ink-secondary">Quiz introuvable</p>
        <Button asChild className="mt-4">
          <Link href="/creator/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    );
  }

  if (created && session) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold">Session créée !</h2>
          <p className="text-ink-secondary">
            Partagez ce mot de passe avec vos participants :
          </p>
          <div className="flex items-center justify-center gap-3 bg-black/[0.05] rounded-lg p-4">
            <span className="text-3xl font-mono font-bold tracking-widest">
              {session.password}
            </span>
            <button
              onClick={handleCopyPassword}
              className="p-2 hover:bg-black/[0.08] rounded transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5 text-ink-secondary" />
              )}
            </button>
          </div>
          <p className="text-sm text-ink-secondary">
            {currentQuiz.title} • {currentQuiz.total_questions} questions
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/creator/session/${session.id}`)}>
              Accéder au panneau de contrôle
            </Button>
            <Button variant="outline" asChild>
              <Link href="/creator/dashboard">Retour au tableau de bord</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/creator/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h2 className="text-xl font-bold">Nouvelle session</h2>
        </div>
        <div className="space-y-2">
          <p className="font-medium">{currentQuiz.title}</p>
          <p className="text-sm text-ink-secondary">
            {currentQuiz.total_questions} questions
          </p>
          <p className="text-sm text-ink-secondary">
            Timer : {currentQuiz.use_global_timer ? `global (${currentQuiz.global_timer_seconds}s)` : 'personnalisé'}
          </p>
        </div>
        <Button onClick={handleCreate} isLoading={sessionLoading} className="w-full">
          Créer la session
        </Button>
      </Card>
    </div>
  );
}