// ─── Global State — Zustand Store ─────────────────────────────────────────────
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';
import type { User, AuthState } from '@/types';

// ── Auth Store ────────────────────────────────────────────────────────────────
interface AuthStore extends AuthState {
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const user = JSON.parse(userData) as User;
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (token, user) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: user => set({ user }),
}));

// ── UI Store ──────────────────────────────────────────────────────────────────
interface UIStore {
  isLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  isLoading: false,
  toastMessage: null,
  toastType: null,

  setLoading: loading => set({ isLoading: loading }),

  showToast: (message, type = 'info') =>
    set({ toastMessage: message, toastType: type }),

  hideToast: () => set({ toastMessage: null, toastType: null }),
}));
