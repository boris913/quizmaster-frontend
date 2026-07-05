'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerProps {
  duration: number; // en secondes
  onComplete?: () => void;
  isActive: boolean;
  className?: string;
  /** 'ring' = compact circular minimal timer (default, low cognitive load). 'bar' = legacy full-width bar. */
  variant?: 'ring' | 'bar';
}

export function Timer({ duration, onComplete, isActive, className, variant = 'ring' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;

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

  const color = progress > 60 ? '#22C55E' : progress > 30 ? '#F59E0B' : '#EF4444';
  const colorClass = progress > 60 ? 'text-success' : progress > 30 ? 'text-warning' : 'text-danger';

  if (variant === 'bar') {
    return (
      <div className={cn('w-full space-y-1', className)} role="timer" aria-live="polite">
        <div className="flex justify-between text-small">
          <span className="font-mono font-medium">{timeLeft}s</span>
          <span className="text-ink-secondary">/{duration}s</span>
        </div>
        <div className="h-2 w-full rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className="h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  }

  // Circular "ring" variant — a single small, calm visual element rather than a bar
  // competing for attention with the question and answers.
  const size = 56;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="timer"
      aria-live="polite"
      aria-label={`${timeLeft} secondes restantes sur ${duration}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(17,24,39,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={cn('absolute font-mono text-small font-semibold tabular-nums', colorClass)}>
        {timeLeft}
      </span>
    </div>
  );
}
