import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme/trackerTokens';
import type { TrackerStackParamList } from './trackerTypes';

import { HomeTab } from '@/screens/tracker/HomeTab';
import { StrengthTab } from '@/screens/tracker/StrengthTab';
import { SessionOverview } from '@/screens/tracker/SessionOverview';
import { ExerciseDetail } from '@/screens/tracker/ExerciseDetail';
import { RunningTab } from '@/screens/tracker/RunningTab';
import { ViewAllOverview } from '@/screens/tracker/ViewAllOverview';
import { AllActivities } from '@/screens/tracker/AllActivities';
import { AccountTab } from '@/screens/tracker/AccountTab';

const Stack = createNativeStackNavigator<TrackerStackParamList>();

// One flat stack for the new Tracker design — see plan: the source has no nested
// tab navigators, and most of the old design's separate routes are in-screen
// sheets/overlays here instead, so the route list shrinks to 8. Each of the 4
// tab-root screens renders its own TrackerTabBar; "switching tabs" resets the
// stack to just that screen (see TrackerTabBar).
export function TrackerNavigator() {
  return (
    <Stack.Navigator initialRouteName="HomeTab" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="HomeTab" component={HomeTab} />
      <Stack.Screen name="StrengthTab" component={StrengthTab} />
      <Stack.Screen name="SessionOverview" component={SessionOverview} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetail} />
      <Stack.Screen name="RunningTab" component={RunningTab} />
      <Stack.Screen name="ViewAllOverview" component={ViewAllOverview} />
      <Stack.Screen name="AllActivities" component={AllActivities} />
      <Stack.Screen name="AccountTab" component={AccountTab} />
    </Stack.Navigator>
  );
}
