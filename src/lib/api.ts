import axios from 'axios';
import { API_URL, HTTP_PREFIX, STORAGE_KEYS } from '@/constants';

const api = axios.create({
  baseURL: `${API_URL}${HTTP_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;