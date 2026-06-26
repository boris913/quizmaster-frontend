'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';

export function useSession() {
  const {
    sessions,
    currentSession,
    participants,
    leaderboard,
    isLoading,
    fetchSessions,
    fetchSession,
    fetchParticipants,
    fetchLeaderboard,
    createSession,
    joinSession,
    endSession,
    updateLeaderboard,
  } = useSessionStore();

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  return {
    sessions,
    currentSession,
    participants,
    leaderboard,
    isLoading,
    fetchSessions,
    fetchSession,
    fetchParticipants,
    fetchLeaderboard,
    createSession,
    joinSession,
    endSession,
    updateLeaderboard,
  };
}