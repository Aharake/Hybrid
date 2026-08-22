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

const OPTIONS: { id: NonNullable<OnboardingFields['equipment']>; label: string; desc: string; recommended?: boolean }[] = [
  { id: 'gym', label: 'Gym', desc: 'Full access to barbells, heavy dumbbells, functional machines & cables', recommended: true },
  { id: 'dumbbells', label: 'Dumbbells only', desc: 'Home or simple hotel setup with fixed/adjustable dumbbells' },
  { id: 'bodyweight', label: 'Bodyweight only', desc: 'No specialized lifting gear needed. Perfect for bodyweight routines' },
];

export function EquipmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Equipment'>>();
  const { equipment, setField } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={40}
      footer={<PrimaryButton label="Continue" disabled={!equipment} onPress={() => navigation.navigate('Focus')} />}
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Equipment</Text>
      <Text style={[typography.subtitle, { marginBottom: 26 }]}>What do you have access to?</Text>
      {OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          desc={opt.desc}
          recommended={opt.recommended}
          selected={equipment === opt.id}
          onPress={() => setField('equipment', opt.id)}
        />
      ))}
    </OnboardingScreen>
  );
}
