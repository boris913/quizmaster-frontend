'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, PlusCircle, LogOut, User } from 'lucide-react';

const navItems = [
  { href: '/creator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creator/quiz/new', label: 'Nouveau quiz', icon: PlusCircle },
];

export function CreatorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="glass border-b border-borderc sticky top-0 z-30">
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href={isAuthenticated ? '/creator/dashboard' : '/'}
          className="flex items-center gap-2 group shrink-0"
        >
          <Logo size={34} className="transition-transform group-hover:scale-105" />
          <span className="text-card-title font-bold text-ink hidden sm:inline">QuizMaster</span>
          <span className="text-caption font-medium text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
            Creator
          </span>
        </Link>

        {isAuthenticated ? (
          <>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-2 rounded-md text-small font-medium transition-colors',
                      isActive ? 'text-primary-700' : 'text-ink-secondary hover:text-ink'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="creator-nav-active"
                        className="absolute inset-0 -z-10 rounded-md bg-primary-50"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:flex items-center gap-1.5 text-small font-medium text-ink-secondary">
                <User className="w-4 h-4" />
                {user?.pseudo}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/player/join">Rejoindre un quiz</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Créer un compte</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
