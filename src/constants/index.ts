export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export const HTTP_PREFIX = '/api';

export const STORAGE_KEYS = {
  TOKEN: 'quizmaster_token',
  USER: 'quizmaster_user',
};