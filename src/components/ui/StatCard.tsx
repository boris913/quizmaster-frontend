'use client';

import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import { ScoreCounter } from './ScoreCounter';

interface StatCardProps {
  icon: ReactNode;
  value: number;
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'accent';
  delay?: number;
}

const tones: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success',
  warning: 'bg-warning-50 text-warning',
  accent: 'bg-accent-50 text-accent',
};

export function StatCard({ icon, value, label, tone = 'primary', delay = 0 }: StatCardProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Card
        interactive
        className="p-5"
      >
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-md', tones[tone])}>{icon}</div>
          <div>
            <p className="text-h2 font-bold text-ink tabular-nums">
              <ScoreCounter value={value} />
            </p>
            <p className="text-small text-ink-secondary font-medium">{label}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
