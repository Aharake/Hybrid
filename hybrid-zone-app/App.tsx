import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { OnboardingNavigator } from '@/navigation/OnboardingNavigator';
import { TrackerNavigator } from '@/navigation/TrackerNavigator';
import { useAppFonts } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { useRootStore } from '@/store/rootStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();
  const hasCompletedOnboarding = useRootStore((s) => s.hasCompletedOnboarding);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <NavigationContainer>
          <StatusBar style="light" />
          {hasCompletedOnboarding ? <TrackerNavigator /> : <OnboardingNavigator />}
        </NavigationContainer>
      </View>
    </GestureHandlerRootView>
  );
}
