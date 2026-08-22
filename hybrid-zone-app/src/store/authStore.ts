import { create } from 'zustand';
import { Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '@/api/client';
import { useRootStore } from './rootStore';

// Set once Google Cloud Console credentials exist (see README) — the Google
// button in AuthScreen hides itself until this is present, so this file is
// safe to ship before that setup is done.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const isGoogleSignInConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

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
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.message ?? body?.error?.message ?? 'Something went wrong. Please try again.';
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

// Shared by every sign-in path (email, Google, later Apple): a successful
// Better Auth response carries the bearer token in the `set-auth-token`
// header and the user in the JSON body. Persists the token and updates
// store state; returns false (with `error` set) on any failure.
async function finishAuth(
  response: Response,
  set: (partial: Partial<AuthStore>) => void,
): Promise<boolean> {
  if (!response.ok) {
    set({ loading: false, error: await extractErrorMessage(response) });
    return false;
  }
  const token = response.headers.get('set-auth-token');
  const data = await response.json();
  if (!token || !data?.user) {
    set({ loading: false, error: 'Signed in, but no session was returned.' });
    return false;
  }
  await setStoredToken(token);
  set({ loading: false, user: data.user, error: null });
  return true;
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
      return await finishAuth(response, set);
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
      return await finishAuth(response, set);
    } catch {
      set({ loading: false, error: 'Could not reach the server. Check your connection.' });
      return false;
    }
  },

  // Native "ID token" flow: sign in on-device with the Google SDK, then hand
  // that idToken to Better Auth to exchange for a session — no OAuth
  // redirect/webview involved. See auth.ts on the server for why clientId
  // is an array there (this idToken's audience is whichever client made the
  // request, so the server has to accept all of them).
  signInWithGoogle: async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      set({ error: 'Google sign-in is not configured yet.' });
      return false;
    }
    set({ loading: true, error: null });
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      });
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) {
        set({ loading: false });
        return false; // user cancelled — not an error
      }
      const idToken = result.data.idToken;
      if (!idToken) {
        set({ loading: false, error: 'Google did not return an ID token.' });
        return false;
      }
      const response = await apiFetch('/api/auth/sign-in/social', {
        method: 'POST',
        body: JSON.stringify({ provider: 'google', idToken: { token: idToken } }),
      });
      return await finishAuth(response, set);
    } catch {
      set({ loading: false, error: 'Google sign-in failed. Please try again.' });
      return false;
    }
  },

  signOut: async () => {
    try {
      await apiFetch('/api/auth/sign-out', { method: 'POST' });
    } catch {
      // best-effort — clear local state regardless
    }
    try {
      await GoogleSignin.signOut();
    } catch {
      // no-op if there was never a Google session
    }
    await clearStoredToken();
    set({ user: null });
    useRootStore.getState().setPhase('loggedOut');
  },

  clearError: () => set({ error: null }),
}));
