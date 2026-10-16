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

// Early in onboarding, on purpose (right after the feature tour): asking for
// location up front (before the user has invested time in the quiz) means the
// OS permission prompt is out of the way well before their first run, instead
// of interrupting them mid-tap on "Start". It has a single "Continue" button
// and no way to skip the request — Apple's guideline 5.1.1(iv) requires that
// the system prompt always follows a custom explanation. Only "When In Use"
// is requested here — Apple only
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
      footer={<PrimaryButton label="Continue" onPress={requestAndContinue} />}
    >
      <View style={styles.wrap}>
        <View style={styles.iconRing}>
          <RunIcon size={30} color={colors.text} />
        </View>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10, textAlign: 'center' }]}>
          Let's find your pace
        </Text>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          Hyvo uses your location to map your route, distance, and pace during runs. Next, your phone will ask
          whether to allow it. You can change your answer any time in Settings.
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
