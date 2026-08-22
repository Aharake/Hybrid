import { create } from 'zustand';

interface RootStore {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
}

// Switches App.tsx between OnboardingNavigator and TrackerNavigator.
export const useRootStore = create<RootStore>((set) => ({
  hasCompletedOnboarding: false,
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
}));
