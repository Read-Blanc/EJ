import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach the Supabase JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// On 401 try to refresh the Supabase session once, then redirect to /login
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient(originalRequest);
      }

      // Refresh failed — sign out and redirect
      await supabase.auth.signOut();
      const current = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
      if (!publicPaths.includes(current)) window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;