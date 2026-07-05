'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularStatProps {
  /** 0-100 */
  percentage: number;
  label: string;
  sublabel?: string;
  size?: number;
  className?: string;
}

export function CircularStat({ percentage, label, sublabel, size = 140, className }: CircularStatProps) {
  const shouldReduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percentage));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(17,24,39,0.07)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#5B5CEB"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-h2 font-bold text-ink tabular-nums">{Math.round(clamped)}%</span>
        </div>
      </div>
      <p className="text-small font-semibold text-ink mt-2">{label}</p>
      {sublabel && <p className="text-caption text-ink-secondary">{sublabel}</p>}
    </div>
  );
}
