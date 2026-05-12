import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'FINANCE' | 'ACCOUNT_MANAGER' | 'VIEWER';

export interface MeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: MeUser | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (u: MeUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'dranzo-auth' },
  ),
);
