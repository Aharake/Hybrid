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

const OPTIONS: { id: NonNullable<OnboardingFields['focus']>; label: string; desc: string; recommended?: boolean }[] = [
  { id: 'mainly_lower', label: 'Mainly lower', desc: 'Prioritize lower body with light upper maintenance' },
  { id: 'balanced', label: 'Balanced', desc: 'Even split between upper and lower body work', recommended: true },
  { id: 'mainly_upper', label: 'Mainly upper', desc: 'Prioritize upper body with light lower maintenance' },
];

export function FocusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Focus'>>();
  const { focus, includeRunning, setField } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={50}
      footer={<PrimaryButton label="Continue" disabled={!focus} onPress={() => navigation.navigate('Motivation2')} />}
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Training Focus</Text>
      <Text style={[typography.subtitle, { marginBottom: 26 }]}>
        {includeRunning
          ? 'We adjust hypertrophy priorities to manage recovery from running days.'
          : 'How do you want to balance your split?'}
      </Text>
      {OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          desc={opt.desc}
          recommended={opt.recommended}
          selected={focus === opt.id}
          onPress={() => setField('focus', opt.id)}
        />
      ))}
    </OnboardingScreen>
  );
}
