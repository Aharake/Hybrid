import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme/tokens';
import type { OnboardingStackParamList } from './types';
import { ExperienceScreen } from '@/screens/onboarding/ExperienceScreen';
import { StrengthGoalScreen } from '@/screens/onboarding/StrengthGoalScreen';
import { Motivation1Screen } from '@/screens/onboarding/Motivation1Screen';
import { EquipmentScreen } from '@/screens/onboarding/EquipmentScreen';
import { FocusScreen } from '@/screens/onboarding/FocusScreen';
import { Motivation2Screen } from '@/screens/onboarding/Motivation2Screen';
import { RunningInterstitialScreen } from '@/screens/onboarding/RunningInterstitialScreen';
import { RunningGoalScreen } from '@/screens/onboarding/RunningGoalScreen';
import { ScheduleScreen } from '@/screens/onboarding/ScheduleScreen';
import { SplitScreen } from '@/screens/onboarding/SplitScreen';
import { SummaryScreen } from '@/screens/onboarding/SummaryScreen';
import { LoadingScreen } from '@/screens/onboarding/LoadingScreen';
import { PlanPreviewScreen } from '@/screens/onboarding/PlanPreviewScreen';
import { PaywallScreen } from '@/screens/onboarding/PaywallScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// Screen-for-screen port of Onboarding.html's nextOf()/goNext() chain (lines 273-297).
// React Navigation's stack handles back-navigation natively, so there's no need to
// port the mockup's manual `history` array.
export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Experience" component={ExperienceScreen} />
      <Stack.Screen name="StrengthGoal" component={StrengthGoalScreen} />
      <Stack.Screen name="Motivation1" component={Motivation1Screen} />
      <Stack.Screen name="Equipment" component={EquipmentScreen} />
      <Stack.Screen name="Focus" component={FocusScreen} />
      <Stack.Screen name="Motivation2" component={Motivation2Screen} />
      <Stack.Screen name="RunningInterstitial" component={RunningInterstitialScreen} />
      <Stack.Screen name="RunningGoal" component={RunningGoalScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Split" component={SplitScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="Loading" component={LoadingScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="PlanPreview" component={PlanPreviewScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
    </Stack.Navigator>
  );
}
