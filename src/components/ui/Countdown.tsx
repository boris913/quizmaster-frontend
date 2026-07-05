'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface CountdownProps {
  value: number;
  message: string;
  isVisible: boolean;
}

export function Countdown({ value, message, isVisible }: CountdownProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center py-8"
      >
        {value > 0 ? (
          <span className="text-display gradient-text">{value}</span>
        ) : (
          <span className="text-h1 font-bold text-success">{message}</span>
        )}
        {value > 0 && (
          <span className="mt-2 text-small text-ink-secondary">Préparez-vous</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}