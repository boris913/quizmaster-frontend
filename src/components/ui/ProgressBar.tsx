'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  className,
  barClassName,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600">{label}</span>
          {showValue && (
            <span className="font-mono text-neutral-700">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out bg-neutral-800',
            barClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}