'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTimer(initialSeconds: number, onComplete?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const start = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setSeconds(initialSeconds);
    setIsActive(false);
    setIsPaused(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isActive || isPaused || seconds <= 0) {
      if (seconds <= 0 && isActive) {
        onComplete?.();
      }
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, seconds, onComplete]);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  return { seconds, isActive, isPaused, start, pause, resume, reset };
}