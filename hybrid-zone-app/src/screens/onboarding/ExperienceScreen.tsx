import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { ExperienceCard } from '@/components/onboarding/ExperienceCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, typography } from '@/theme/tokens';
import { BarbellIcon, RunIcon } from '@/icons';
import type { OnboardingStackParamList } from '@/navigation/types';

export function ExperienceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Experience'>>();
  const { strengthExp, runningExp, setField } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={8}
      footer={
        <PrimaryButton
          label="Continue"
          disabled={!strengthExp || !runningExp}
          onPress={() => navigation.navigate('StrengthGoal')}
        />
      }
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Where are you starting from?</Text>
      <Text style={[typography.subtitle, { marginBottom: 26 }]}>This helps us calibrate your starting intensity.</Text>
      <ExperienceCard
        title="Strength"
        icon={<BarbellIcon size={20} color={colors.textDim} />}
        value={strengthExp}
        onChange={(v) => setField('strengthExp', v)}
      />
      <ExperienceCard
        title="Running"
        icon={<RunIcon size={20} color={colors.textDim} />}
        value={runningExp}
        onChange={(v) => setField('runningExp', v)}
      />
    </OnboardingScreen>
  );
}
