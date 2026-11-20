'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useQuiz } from '@/hooks/useQuiz';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonCardRow } from '@/components/ui/Skeleton';
import { DeleteSessionButton } from '@/components/creator/DeleteSessionButton';
import {
  PlusCircle,
  List,
  Play,
  Calendar,
  FileQuestion,
  ChevronRight,
  Sparkles,
  ListChecks,
  BarChart3,
} from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { quizzes, isLoading: quizzesLoading } = useQuiz();
  const { sessions, isLoading: sessionsLoading } = useSession();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const activeSessions = sessions?.filter((s) => s.status !== 'finished') || [];
  const totalQuestions = quizzes?.reduce((sum, q) => sum + (q.total_questions || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-content mx-auto px-6 py-10">
        {/* Hero greeting — the primary, largest element on this screen */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10"
        >
          <div>
            <p className="text-small text-ink-secondary font-medium">{getGreeting()},</p>
            <h1 className="text-h1 sm:text-display leading-tight text-ink">
              {user?.pseudo} <span className="gradient-text">👋</span>
            </h1>
            <p className="text-ink-secondary mt-2">Gérez vos quiz et lancez des sessions en direct.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/creator/quiz/new">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nouveau quiz
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/creator/quiz/import">
                <List className="w-4 h-4 mr-2" />
                Importer
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <StatCard
            icon={<FileQuestion className="w-5 h-5" />}
            value={quizzes?.length || 0}
            label="Quiz créés"
            tone="primary"
            delay={0}
          />
          <StatCard
            icon={<Play className="w-5 h-5" />}
            value={activeSessions.length}
            label="Sessions actives"
            tone="success"
            delay={0.05}
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            value={sessions?.length || 0}
            label="Sessions totales"
            tone="accent"
            delay={0.1}
          />
          <StatCard
            icon={<ListChecks className="w-5 h-5" />}
            value={totalQuestions}
            label="Questions au total"
            tone="warning"
            delay={0.15}
          />
        </div>

        {/* Quiz / Sessions grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz section */}
          <div>
            <h2 className="text-h3 mb-4 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-ink-secondary" />
              Mes quiz
            </h2>
            <div className="space-y-3">
              {quizzesLoading ? (
                <div className="space-y-3">
                  <SkeletonCardRow />
                  <SkeletonCardRow />
                  <SkeletonCardRow />
                </div>
              ) : quizzes?.length === 0 ? (
                <EmptyState
                  icon={<FileQuestion className="w-8 h-8" />}
                  title="Aucun quiz"
                  description="Créez votre premier quiz manuellement ou importez-le depuis un fichier."
                  action={
                    <Button size="sm" asChild>
                      <Link href="/creator/quiz/new">
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Créer un quiz
                      </Link>
                    </Button>
                  }
                  className="bg-surface rounded-lg border border-borderc"
                />
              ) : (
                quizzes.slice(0, 5).map((quiz) => (
                  <Link key={quiz.id} href={`/creator/quiz/${quiz.id}`} className="block group">
                    <Card interactive className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-card-title text-ink">{quiz.title}</h3>
                          <p className="text-small text-ink-secondary">
                            {quiz.total_questions} questions
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-ink-secondary/50 group-hover:text-primary transition-colors" />
                      </div>
                    </Card>
                  </Link>
                ))
              )}
              {quizzes && quizzes.length > 5 && (
                <p className="text-small text-ink-secondary/70 text-center pt-2">
                  + {quizzes.length - 5} autres quiz
                </p>
              )}
            </div>
          </div>

          {/* Sessions section */}
          <div>
            <h2 className="text-h3 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-ink-secondary" />
              Sessions récentes
            </h2>
            <div className="space-y-3">
              {sessionsLoading ? (
                <div className="space-y-3">
                  <SkeletonCardRow />
                  <SkeletonCardRow />
                  <SkeletonCardRow />
                </div>
              ) : sessions?.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="w-8 h-8" />}
                  title="Aucune session"
                  description="Lancez une session en direct à partir d'un de vos quiz pour démarrer un jeu."
                  action={
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/creator/quiz">
                        <Play className="w-4 h-4 mr-1" />
                        Voir mes quiz
                      </Link>
                    </Button>
                  }
                  className="bg-surface rounded-lg border border-borderc"
                />
              ) : (
                sessions.slice(0, 5).map((session) => {
                  const title = session.quiz_title || session.quizzes?.title || 'Quiz sans titre';
                  return (
                  <Card key={session.id} interactive className="p-4 flex items-center gap-2">
                    <Link
                      href={`/creator/session/${session.id}`}
                      className="group flex flex-1 min-w-0 items-center justify-between"
                    >
                      <div>
                        <h3 className="text-card-title text-ink">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2 text-small mt-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium ${
                              session.status === 'active'
                                ? 'bg-success-50 text-success border border-success/20'
                                : session.status === 'paused'
                                ? 'bg-warning-50 text-warning border border-warning/20'
                                : session.status === 'finished'
                                ? 'bg-black/[0.04] text-ink-secondary border border-borderc'
                                : 'bg-primary-50 text-primary-700 border border-primary-200'
                            }`}
                          >
                            {session.status}
                          </span>
                          <span className="text-ink-secondary/40">•</span>
                          <span className="font-mono text-caption text-ink-secondary bg-black/[0.03] px-1.5 py-0.5 rounded border border-borderc">
                            {session.password}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-secondary/50 group-hover:text-primary transition-colors" />
                    </Link>
                    {session.status !== 'waiting' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-primary-700 hover:bg-primary-50"
                      >
                        <Link
                          href={`/creator/session/${session.id}/results`}
                          aria-label={`Voir le rapport : ${title}`}
                          title="Voir le rapport"
                        >
                          <BarChart3 className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                    <DeleteSessionButton sessionId={session.id} sessionLabel={title} />
                  </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
