import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { OnboardingNavigator } from '@/navigation/OnboardingNavigator';
import { TrackerNavigator } from '@/navigation/TrackerNavigator';
import { AuthScreen } from '@/screens/AuthScreen';
import { useAppFonts } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { useRootStore } from '@/store/rootStore';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();
  const phase = useRootStore((s) => s.phase);
  const setPhase = useRootStore((s) => s.setPhase);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && phase !== 'checking') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, phase]);

  if ((!fontsLoaded && !fontError) || phase === 'checking') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <NavigationContainer>
          <StatusBar style="light" />
          {phase === 'authenticated' && <TrackerNavigator />}
          {phase === 'onboarding' && <OnboardingNavigator />}
          {phase === 'loggedOut' && <AuthScreen onAuthenticated={() => setPhase('authenticated')} />}
        </NavigationContainer>
      </View>
    </GestureHandlerRootView>
  );
}
