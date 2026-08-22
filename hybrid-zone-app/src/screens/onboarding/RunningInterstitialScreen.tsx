import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

export function RunningInterstitialScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'RunningInterstitial'>>();
  const { acceptRunning, declineRunning } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={66}
      footer={
        <>
          <PrimaryButton
            label="Yes, add running"
            onPress={() => {
              acceptRunning();
              navigation.navigate('RunningGoal');
            }}
          />
          <PrimaryButton
            label="No thanks"
            variant="ghost"
            onPress={() => {
              declineRunning();
              navigation.navigate('Schedule');
            }}
          />
        </>
      }
    >
      <View style={{ paddingTop: 20 }}>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Interested in running too?</Text>
        <Text style={typography.subtitle}>
          Hybrid Zone can layer a running plan on top of your strength training — same app, same week, zero extra
          setup.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
