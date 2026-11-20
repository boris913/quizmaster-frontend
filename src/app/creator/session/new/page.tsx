'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuiz } from '@/hooks/useQuiz';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NicknameMode } from '@/lib/nickname';
import type { ScoringMode } from '@/types';

const NICKNAME_MODE_OPTIONS: { value: NicknameMode; label: string; description: string }[] = [
  {
    value: 'free',
    label: 'Pseudos libres',
    description: 'Chaque élève choisit son pseudo ; les termes inappropriés sont refusés.',
  },
  {
    value: 'generated',
    label: 'Pseudos générés',
    description: 'Chaque élève tire un pseudo au sort (ex. « Loutre Curieuse »), 3 essais maximum.',
  },
];

const SCORING_MODE_OPTIONS: { value: ScoringMode; label: string; badge?: string; description: string }[] = [
  {
    value: 'speed',
    label: 'Vitesse',
    description: 'Plus l’élève répond vite et juste, plus il marque de points.',
  },
  {
    value: 'accuracy',
    label: 'Précision',
    badge: 'recommandé pour réviser',
    description: 'Toute bonne réponse donnée dans le temps rapporte le maximum : inutile de se précipiter.',
  },
];

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');
  const { currentQuiz, fetchQuiz, isLoading: quizLoading } = useQuiz();
  const { createSession, isLoading: sessionLoading } = useSession();
  const [created, setCreated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [nicknameMode, setNicknameMode] = useState<NicknameMode>('free');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('speed');
  const [hideLeaderboard, setHideLeaderboard] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz(quizId);
    }
  }, [quizId]);

  const handleCreate = async () => {
    if (!quizId) return;
    try {
      const s = await createSession(quizId, {
        nicknameMode,
        scoringMode,
        showLeaderboard: !hideLeaderboard,
      });
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
          <p className="text-sm text-ink-secondary">
            {(session.nickname_mode ?? nicknameMode) === 'generated' ? 'Pseudos générés' : 'Pseudos libres'}
          </p>
          <p className="text-sm text-ink-secondary" data-testid="session-scoring-summary">
            {(session.scoring_mode ?? scoringMode) === 'accuracy' ? 'Mode Précision' : 'Mode Vitesse'}
            {' • '}
            {(session.show_leaderboard ?? !hideLeaderboard) === false
              ? 'Classement masqué aux élèves'
              : 'Classement visible'}
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
        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink mb-2">Pseudos des participants</legend>
          {NICKNAME_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
                'focus-within:ring-2 focus-within:ring-primary',
                nicknameMode === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
              )}
            >
              <input
                type="radio"
                name="nicknameMode"
                value={option.value}
                checked={nicknameMode === option.value}
                onChange={() => setNicknameMode(option.value)}
                aria-labelledby={`nickname-mode-${option.value}-label`}
                aria-describedby={`nickname-mode-${option.value}-desc`}
                className="mt-1 accent-primary"
              />
              <span className="space-y-0.5">
                <span id={`nickname-mode-${option.value}-label`} className="block font-medium">
                  {option.label}
                </span>
                <span id={`nickname-mode-${option.value}-desc`} className="block text-small text-ink-secondary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink mb-2">Mode de score</legend>
          {SCORING_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
                'focus-within:ring-2 focus-within:ring-primary',
                scoringMode === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
              )}
            >
              <input
                type="radio"
                name="scoringMode"
                value={option.value}
                checked={scoringMode === option.value}
                onChange={() => setScoringMode(option.value)}
                aria-labelledby={`scoring-mode-${option.value}-label`}
                aria-describedby={`scoring-mode-${option.value}-desc`}
                className="mt-1 accent-primary"
              />
              <span className="space-y-0.5">
                <span id={`scoring-mode-${option.value}-label`} className="block font-medium">
                  {option.label}
                  {option.badge && (
                    <span className="ml-2 rounded-full bg-success-50 px-2 py-0.5 text-caption font-medium text-success">
                      {option.badge}
                    </span>
                  )}
                </span>
                <span id={`scoring-mode-${option.value}-desc`} className="block text-small text-ink-secondary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <label
          className={cn(
            'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
            'focus-within:ring-2 focus-within:ring-primary',
            hideLeaderboard ? 'border-primary bg-primary-50' : 'border-borderc'
          )}
        >
          <input
            type="checkbox"
            name="hideLeaderboard"
            checked={hideLeaderboard}
            onChange={(e) => setHideLeaderboard(e.target.checked)}
            aria-labelledby="hide-leaderboard-label"
            aria-describedby="hide-leaderboard-desc"
            className="mt-1 accent-primary"
          />
          <span className="space-y-0.5">
            <span id="hide-leaderboard-label" className="block font-medium">
              Masquer le classement aux élèves
            </span>
            <span id="hide-leaderboard-desc" className="block text-small text-ink-secondary">
              Chaque élève ne voit que son score et la réussite de la classe ; vous gardez le classement complet.
            </span>
          </span>
        </label>
        <Button onClick={handleCreate} isLoading={sessionLoading} className="w-full">
          Créer la session
        </Button>
      </Card>
    </div>
  );
}