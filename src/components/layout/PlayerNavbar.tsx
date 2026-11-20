'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/playerStore';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ScoreCounter } from '@/components/ui/ScoreCounter';
import { Trophy, LogOut } from 'lucide-react';

const rankEmojis = ['🥇', '🥈', '🥉'];

export function PlayerNavbar() {
  const router = useRouter();
  const { participant, score, rank, isFinished, reset } = usePlayerStore();

  const handleLeave = () => {
    reset();
    router.push('/player/join');
  };

  return (
    <header className="glass border-b border-borderc sticky top-0 z-30">
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Logo size={34} className="transition-transform group-hover:scale-105" />
          <span className="text-card-title font-bold text-ink hidden sm:inline">Kwizora</span>
          <span className="text-caption font-medium text-accent bg-accent-50 px-2 py-0.5 rounded-full border border-accent/20">
            Joueur
          </span>
        </Link>

        {participant ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-small font-medium text-ink-secondary hidden sm:inline">
              {participant.pseudo}
            </span>

            {/* Live, auto-refreshing score badge — updates the instant the store changes */}
            <motion.div
              key={score}
              initial={{ scale: 1 }}
              animate={{ scale: [1.08, 1] }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1.5"
            >
              <span className="font-mono font-bold text-primary-700 tabular-nums text-small">
                <ScoreCounter value={score} />
              </span>
              <span className="text-caption text-primary-700/80 font-medium">pts</span>
            </motion.div>

            <AnimatePresence>
              {rank > 0 && (
                <motion.span
                  key={rank}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hidden sm:flex items-center gap-1 text-small font-semibold text-ink-secondary"
                >
                  {rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}
                </motion.span>
              )}
            </AnimatePresence>

            {isFinished && (
              <Button variant="ghost" size="sm" onClick={handleLeave}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Quitter</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Trophy className="w-4 h-4 text-ink-secondary/50 hidden sm:block" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Accueil</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
