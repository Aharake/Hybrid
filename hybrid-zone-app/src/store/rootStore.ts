import { create } from 'zustand';

export type AppPhase = 'checking' | 'onboarding' | 'loggedOut' | 'authenticated';

interface RootStore {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
}

// Switches App.tsx between the onboarding flow, a standalone login screen,
// and the Tracker app. 'checking' is the brief window on launch while
// authStore.bootstrap() verifies any stored session against the API.
export const useRootStore = create<RootStore>((set) => ({
  phase: 'checking',
  setPhase: (phase) => set({ phase }),
}));
