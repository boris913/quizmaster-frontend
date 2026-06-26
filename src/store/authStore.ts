'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';

interface User {
  id: string;
  pseudo: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (pseudo: string, password: string) => Promise<void>;
  register: (pseudo: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (pseudo, password) => {
        const { data } = await api.post('/auth/login', { pseudo, password });
        set({ user: data.user, token: data.access_token, isAuthenticated: true });
      },

      register: async (pseudo, password) => {
        const { data } = await api.post('/auth/register', { pseudo, password });
        set({ user: data.user, token: data.access_token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      },

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);