import axios from 'axios';
import { API_URL, HTTP_PREFIX } from '@/constants';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: `${API_URL}${HTTP_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Récupérer le token depuis le store Zustand
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;