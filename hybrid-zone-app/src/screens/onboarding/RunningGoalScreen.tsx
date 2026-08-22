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

const OPTIONS: { id: NonNullable<OnboardingFields['runningGoal']>; label: string; desc: string }[] = [
  { id: 'first5k', label: 'Run my first 5K', desc: 'Build up your lung capacity and stamina from scratch' },
  { id: 'fun', label: 'Run for fun', desc: 'Maintain baseline health with stress-free aerobic pace' },
  { id: 'faster', label: 'Get faster', desc: 'Improve structural efficiency to drop 5K & 10K target times' },
  { id: 'further', label: 'Go further', desc: 'Optimize weekly endurance volumes to train for half & full marathons' },
];

export function RunningGoalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'RunningGoal'>>();
  const { runningGoal, setField, initScheduleFromAnswers } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={74}
      footer={
        <PrimaryButton
          label="Continue"
          disabled={!runningGoal}
          onPress={() => {
            initScheduleFromAnswers();
            navigation.navigate('Schedule');
          }}
        />
      }
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Running Goal</Text>
      <Text style={[typography.subtitle, { marginBottom: 26 }]}>What are you training for?</Text>
      {OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          desc={opt.desc}
          selected={runningGoal === opt.id}
          onPress={() => setField('runningGoal', opt.id)}
        />
      ))}
    </OnboardingScreen>
  );
}
