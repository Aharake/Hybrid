import React from 'react';
import { Alert } from 'react-native';
import { AuthScreen } from '@/screens/AuthScreen';
import { syncOnboardingAnswers } from '@/api/onboardingAnswers';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useRootStore } from '@/store/rootStore';

// The final step of the onboarding flow (reached from Paywall's "Start free
// trial"): create the account, then persist the quiz answers just collected
// before switching over to the Tracker app.
export function OnboardingAuthScreen() {
  const onboardingFields = useOnboardingStore();
  const setPhase = useRootStore((s) => s.setPhase);

  return (
    <AuthScreen
      onAuthenticated={async () => {
        try {
          await syncOnboardingAnswers(onboardingFields);
        } catch {
          Alert.alert("Couldn't save your plan", 'Your account was created, but saving your answers failed. You can try again from Settings later.');
        }
        setPhase('authenticated');
      }}
    />
  );
}
