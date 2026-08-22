import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { GrowthChart } from '@/components/onboarding/GrowthChart';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

const COPY: Record<string, [string, string, string]> = {
  general: ["We'll help you stay ", 'consistent', ' with sustainable training.'],
  strength: ["We'll help you get ", 'stronger', ' with the right intensity.'],
  muscle: ["We'll help you build ", 'muscle', ' with the right volume.'],
  tone: ["We'll help you get ", 'lean', ' without losing the muscle.'],
};

export function Motivation1Screen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Motivation1'>>();
  const strengthGoal = useOnboardingStore((s) => s.strengthGoal);
  const copy = (strengthGoal && COPY[strengthGoal]) || COPY.general;

  return (
    <OnboardingScreen progress={30} footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('Equipment')} />}>
      <View style={{ paddingTop: 10 }}>
        <Text style={[typography.title, { color: colors.text }]}>
          {copy[0]}
          {copy[1]}
          {copy[2]}
        </Text>
      </View>
      <GrowthChart />
    </OnboardingScreen>
  );
}
