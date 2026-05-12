import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/state/auth-store';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    if (status === 401 && !original._retried) {
      original._retried = true;
      const refresh = useAuthStore.getState().refreshToken;
      if (!refresh) {
        useAuthStore.getState().clear();
        return Promise.reject(error);
      }
      refreshPromise =
        refreshPromise ??
        api
          .post('/auth/refresh', { refreshToken: refresh })
          .then((r) => {
            const data = r.data as {
              accessToken: string;
              refreshToken: string;
            };
            useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
          })
          .catch(() => {
            useAuthStore.getState().clear();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });

      const newToken = await refreshPromise;
      if (!newToken) return Promise.reject(error);
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  },
);
