'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerProps {
  duration: number; // en secondes
  onComplete?: () => void;
  isActive: boolean;
  className?: string;
}

export function Timer({ duration, onComplete, isActive, className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const progress = (timeLeft / duration) * 100;

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  const color = progress > 60 ? 'bg-green-500' : progress > 30 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className="font-mono">{timeLeft}s</span>
        <span className="text-neutral-500">/{duration}s</span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-1000 ease-linear', color)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}