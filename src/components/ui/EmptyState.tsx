'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn('flex flex-col items-center justify-center text-center py-14 px-4', className)}
    >
      <div className="relative w-20 h-20 mb-5">
        <div className="absolute inset-0 rounded-full bg-primary-50 animate-float" />
        <div className="absolute inset-0 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <h3 className="text-card-title text-ink">{title}</h3>
      <p className="text-small text-ink-secondary max-w-sm mt-1.5">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
