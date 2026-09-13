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
import { CustomWorkoutScreen } from '@/screens/tracker/CustomWorkoutScreen';
import { ProgramEditorScreen } from '@/screens/tracker/ProgramEditorScreen';
import { AnalyticsHubScreen } from '@/screens/tracker/AnalyticsHubScreen';
import { AchievementsHubScreen } from '@/screens/tracker/AchievementsHubScreen';
import { HelpSupportScreen } from '@/screens/tracker/HelpSupportScreen';
import { AboutScreen } from '@/screens/tracker/AboutScreen';
import { UpgradeScreen } from '@/screens/tracker/UpgradeScreen';
import { ConnectedAppsScreen } from '@/screens/tracker/ConnectedAppsScreen';
import { PrivacySettingsScreen } from '@/screens/tracker/PrivacySettingsScreen';
import { RunDetailScreen } from '@/screens/tracker/RunDetailScreen';
import { StrengthDetailScreen } from '@/screens/tracker/StrengthDetailScreen';
import { OtherActivityDetailScreen } from '@/screens/tracker/OtherActivityDetailScreen';
import { LogActivityFormScreen } from '@/screens/tracker/LogActivityFormScreen';
import { RunShareCardScreen } from '@/screens/tracker/RunShareCardScreen';

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
      <Stack.Screen name="CustomWorkout" component={CustomWorkoutScreen} />
      <Stack.Screen name="ProgramEditor" component={ProgramEditorScreen} />
      <Stack.Screen name="AnalyticsHub" component={AnalyticsHubScreen} />
      <Stack.Screen name="AchievementsHub" component={AchievementsHubScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      <Stack.Screen name="ConnectedApps" component={ConnectedAppsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="RunDetail" component={RunDetailScreen} />
      <Stack.Screen name="StrengthDetail" component={StrengthDetailScreen} />
      <Stack.Screen name="OtherActivityDetail" component={OtherActivityDetailScreen} />
      <Stack.Screen name="LogActivityForm" component={LogActivityFormScreen} />
      <Stack.Screen name="RunShareCard" component={RunShareCardScreen} />
    </Stack.Navigator>
  );
}
