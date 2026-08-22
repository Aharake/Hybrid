import { create } from 'zustand';
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '@/api/client';
import { useRootStore } from './rootStore';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

async function extractAuthToken(response: Response): Promise<string | null> {
  return response.headers.get('set-auth-token');
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.message ?? body?.error?.message ?? 'Something went wrong. Please try again.';
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  // Runs once on app launch: if a token is already stored, verify it's still
  // valid against the API before dropping the user straight into the Tracker.
  bootstrap: async () => {
    const token = await getStoredToken();
    if (!token) {
      useRootStore.getState().setPhase('onboarding');
      return;
    }
    try {
      const response = await apiFetch('/api/auth/get-session', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data?.user) {
          set({ user: data.user });
          useRootStore.getState().setPhase('authenticated');
          return;
        }
      }
    } catch {
      // network error on launch — fall through and treat as logged out
    }
    await clearStoredToken();
    useRootStore.getState().setPhase('onboarding');
  },

  signUp: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const response = await apiFetch('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      if (!response.ok) {
        set({ loading: false, error: await extractErrorMessage(response) });
        return false;
      }
      const token = await extractAuthToken(response);
      const data = await response.json();
      if (!token || !data?.user) {
        set({ loading: false, error: 'Sign up succeeded but no session was returned.' });
        return false;
      }
      await setStoredToken(token);
      set({ loading: false, user: data.user });
      return true;
    } catch {
      set({ loading: false, error: 'Could not reach the server. Check your connection.' });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await apiFetch('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        set({ loading: false, error: await extractErrorMessage(response) });
        return false;
      }
      const token = await extractAuthToken(response);
      const data = await response.json();
      if (!token || !data?.user) {
        set({ loading: false, error: 'Sign in succeeded but no session was returned.' });
        return false;
      }
      await setStoredToken(token);
      set({ loading: false, user: data.user });
      return true;
    } catch {
      set({ loading: false, error: 'Could not reach the server. Check your connection.' });
      return false;
    }
  },

  signOut: async () => {
    try {
      await apiFetch('/api/auth/sign-out', { method: 'POST' });
    } catch {
      // best-effort — clear local state regardless
    }
    await clearStoredToken();
    set({ user: null });
    useRootStore.getState().setPhase('loggedOut');
  },

  clearError: () => set({ error: null }),
}));
