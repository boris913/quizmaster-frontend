'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types';
import { useSocket } from './useSocket';
import { useSessionStore } from '@/store/sessionStore';

export function useLeaderboard(sessionId: string) {
  const { socket, isConnected } = useSocket();
  const { leaderboard, updateLeaderboard, fetchLeaderboard } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchLeaderboard(sessionId).finally(() => setIsLoading(false));
    }
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLeaderboardUpdate = (data: { leaderboard: LeaderboardEntry[] }) => {
      updateLeaderboard(data.leaderboard);
    };

    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('question:ended', (data: { leaderboard: LeaderboardEntry[] }) => {
      updateLeaderboard(data.leaderboard);
    });

    return () => {
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('question:ended');
    };
  }, [socket, isConnected, updateLeaderboard]);

  return { leaderboard, isLoading };
}