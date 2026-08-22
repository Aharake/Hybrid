import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { OptionCard } from '@/components/OptionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore, OnboardingFields } from '@/store/onboardingStore';
import { colors, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

const OPTIONS: { id: NonNullable<OnboardingFields['strengthGoal']>; label: string; desc: string }[] = [
  { id: 'general', label: 'General fitness', desc: 'Stay active, burn fat, and build foundational functional health' },
  { id: 'strength', label: 'Build strength', desc: 'Increase your neuromuscular output and power up max barbell lifts' },
  { id: 'muscle', label: 'Build muscle', desc: 'Optimize sets and loading parameters to maximize clean hypertrophy' },
  { id: 'tone', label: 'Tone & lose fat', desc: 'Higher-rep, higher-density training to support a lean, defined look' },
];

export function StrengthGoalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'StrengthGoal'>>();
  const { strengthGoal, setField } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={20}
      footer={
        <PrimaryButton label="Continue" disabled={!strengthGoal} onPress={() => navigation.navigate('Motivation1')} />
      }
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Goal</Text>
      <Text style={[typography.subtitle, { marginBottom: 26 }]}>What's your main strength focus right now?</Text>
      {OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          desc={opt.desc}
          selected={strengthGoal === opt.id}
          onPress={() => setField('strengthGoal', opt.id)}
        />
      ))}
    </OnboardingScreen>
  );
}
