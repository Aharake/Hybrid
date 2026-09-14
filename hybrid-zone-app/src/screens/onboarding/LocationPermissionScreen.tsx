import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RunIcon } from '@/icons';
import { colors, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

// First screen of onboarding, on purpose: asking for location up front (before
// the user has invested time in the quiz) means the OS permission prompt is
// out of the way well before their first run, instead of interrupting them
// mid-tap on "Start". Only "When In Use" is requested here — Apple only
// allows asking for "Always" after that's granted, which startRunTracking()
// (src/engine/locationTask.ts) does later, right when a run actually starts.
export function LocationPermissionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'LocationPermission'>>();

  const requestAndContinue = async () => {
    await Location.requestForegroundPermissionsAsync().catch(() => null);
    navigation.navigate('Experience');
  };

  return (
    <OnboardingScreen
      footer={
        <>
          <PrimaryButton label="Enable location" onPress={requestAndContinue} />
          <PrimaryButton label="Not now" variant="ghost" onPress={() => navigation.navigate('Experience')} />
        </>
      }
    >
      <View style={styles.wrap}>
        <View style={styles.iconRing}>
          <RunIcon size={30} color={colors.text} />
        </View>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10, textAlign: 'center' }]}>
          Let's find your pace
        </Text>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          Hyvo uses your location to map your route, distance, and pace during runs. Turn it on now so you're ready
          to go the moment your plan is.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});
