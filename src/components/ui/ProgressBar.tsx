'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
  barClassName?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = 'sm',
  className,
  barClassName,
}: ProgressBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex justify-between text-small">
          <span className="text-ink-secondary">{label}</span>
          {showValue && (
            <span className="font-display tabular-nums text-ink font-medium">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'w-full rounded-full bg-ink/[0.06] overflow-hidden',
          size === 'lg' ? 'h-3' : 'h-2'
        )}
      >
        <motion.div
          className={cn('h-full rounded-full bg-primary', barClassName)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
          }
        />
      </div>
    </div>
  );
}
