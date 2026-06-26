'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useQuiz } from '@/hooks/useQuiz';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Logo } from '@/components/ui/Logo';
import {
  PlusCircle,
  List,
  Users,
  Calendar,
  LogOut,
  FileQuestion,
  Play,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { quizzes, isLoading: quizzesLoading } = useQuiz();
  const { sessions, isLoading: sessionsLoading } = useSession();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const activeSessions = sessions?.filter(s => s.status !== 'finished') || [];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Header avec logo et déconnexion */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/creator/dashboard" className="flex items-center gap-2 group">
          <Logo size={36} className="transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold text-slate-900">QuizMaster</span>
          <span className="ml-2 text-xs font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
            Creator
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium hidden sm:inline">
            {user?.pseudo}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
            <LogOut className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* En-tête avec actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
            <p className="text-slate-500 mt-1">Gérez vos quiz et lancez des sessions en direct</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="shadow-sm hover:shadow transition-shadow">
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
        </div>

        {/* Cartes statistiques modernisées */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <Card className="p-5 border-slate-100 shadow-sm shadow-slate-100/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-50/80 rounded-xl text-blue-600">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{quizzes?.length || 0}</p>
                <p className="text-sm text-slate-500 font-medium">Quiz créés</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border-slate-100 shadow-sm shadow-slate-100/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50/80 rounded-xl text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{activeSessions.length}</p>
                <p className="text-sm text-slate-500 font-medium">Sessions actives</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border-slate-100 shadow-sm shadow-slate-100/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-amber-50/80 rounded-xl text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{sessions?.length || 0}</p>
                <p className="text-sm text-slate-500 font-medium">Sessions totales</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Grille Quiz / Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Quiz */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-slate-400" />
              Mes quiz
            </h2>
            <div className="space-y-3">
              {quizzesLoading ? (
                <p className="text-slate-400 text-sm">Chargement...</p>
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
                  className="bg-white rounded-xl border border-slate-200/60 shadow-sm"
                />
              ) : (
                quizzes.slice(0, 5).map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/creator/quiz/${quiz.id}`}
                    className="block group"
                  >
                    <Card className="p-4 border-slate-100 shadow-sm shadow-slate-100/50 hover:shadow-md transition-all hover:border-slate-300/80 hover:scale-[1.01] duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {quiz.total_questions} questions
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Card>
                  </Link>
                ))
              )}
              {quizzes && quizzes.length > 5 && (
                <p className="text-sm text-slate-400 text-center pt-2">
                  + {quizzes.length - 5} autres quiz
                </p>
              )}
            </div>
          </div>

          {/* Section Sessions */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-slate-400" />
              Sessions récentes
            </h2>
            <div className="space-y-3">
              {sessionsLoading ? (
                <p className="text-slate-400 text-sm">Chargement...</p>
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
                  className="bg-white rounded-xl border border-slate-200/60 shadow-sm"
                />
              ) : (
                sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/creator/session/${session.id}`}
                    className="block group"
                  >
                    <Card className="p-4 border-slate-100 shadow-sm shadow-slate-100/50 hover:shadow-md transition-all hover:border-slate-300/80 hover:scale-[1.01] duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
                            {session.quiz_title || 'Quiz sans titre'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm mt-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                session.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                  : session.status === 'paused'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                  : session.status === 'finished'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200/50'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200/50'
                              }`}
                            >
                              {session.status}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                              {session.password}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}