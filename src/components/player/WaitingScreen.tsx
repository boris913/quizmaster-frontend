'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, PauseCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '../ui/Card';

interface WaitingScreenProps {
  message?: string;
  isPaused?: boolean;
}

export function WaitingScreen({ message, isPaused = false }: WaitingScreenProps) {
  const t = useTranslations('player.waiting');
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card tier="primary" className="p-10 text-center max-w-md w-full">
        {isPaused ? (
          <div className="space-y-3">
            <PauseCircle className="w-14 h-14 mx-auto text-warning" strokeWidth={1.5} />
            <h3 className="text-h3">{t('pausedTitle')}</h3>
            <p className="text-ink-secondary text-small">{t('pausedText')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <motion.div
              className="w-16 h-16 mx-auto rounded-full bg-primary-50 flex items-center justify-center"
              animate={shouldReduceMotion ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              <Sparkles className="w-7 h-7 text-primary" />
            </motion.div>
            <h3 className="text-h3">{message ?? t('default')}</h3>
            <p className="text-small text-ink-secondary">{t('ready')}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
