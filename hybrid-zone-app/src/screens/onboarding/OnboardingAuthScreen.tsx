import React from 'react';
import { Alert } from 'react-native';
import { AuthScreen } from '@/screens/AuthScreen';
import { syncOnboardingAnswers } from '@/api/onboardingAnswers';
import { getProgram } from '@/api/program';
import { buildProgram } from '@/engine/programBuilder';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useRootStore } from '@/store/rootStore';
import { useTrackerStore } from '@/store/trackerStore';

// The final step of the onboarding flow (reached from Paywall's "Start free
// trial"): sign up (or log in), then turn the quiz answers into the user's real
// program before switching over to the Tracker app.
export function OnboardingAuthScreen() {
  const setPhase = useRootStore((s) => s.setPhase);

  return (
    <AuthScreen
      onAuthenticated={async () => {
        // Someone who already has a program (logging back in from the quiz) keeps
        // it — the quiz must not overwrite their saved plan and answers.
        let hasProgram: boolean | null = null; // null = couldn't check
        try {
          const existing = await getProgram();
          hasProgram = !!existing && existing.sessions.length > 0;
        } catch {
          hasProgram = null;
        }

        if (hasProgram === false) {
          const a = useOnboardingStore.getState();
          const built = buildProgram({
            schedule: a.schedule,
            split: a.split,
            focus: a.focus,
            equipment: a.equipment,
            strengthGoal: a.strengthGoal,
            includeRunning: a.includeRunning,
            runningGoal: a.runningGoal,
            runningExp: a.runningExp,
          });
          useTrackerStore.getState().setProgram(built.sessions, built.runSessions, built.split, true);
          try {
            await syncOnboardingAnswers(a);
          } catch {
            Alert.alert("Couldn't back up your answers", 'Your plan is ready and saved to your account, but your quiz answers could not be uploaded. That does not affect your plan.');
          }
        } else if (hasProgram === null) {
          Alert.alert("Couldn't load your plan", 'Check your connection. Your plan will finish setting up the next time the app can reach the server.');
        }
        setPhase('authenticated');
      }}
    />
  );
}
