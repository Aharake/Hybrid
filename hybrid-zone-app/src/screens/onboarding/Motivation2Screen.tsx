import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { BarsChart } from '@/components/onboarding/BarsChart';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

export function Motivation2Screen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Motivation2'>>();

  return (
    <OnboardingScreen
      progress={58}
      footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('RunningInterstitial')} />}
    >
      <BarsChart />
      <View style={{ alignItems: 'center', paddingTop: 30 }}>
        <Text style={[typography.title, { fontSize: 27, lineHeight: 32, color: colors.text, textAlign: 'center' }]}>
          Good foundation. Time to train with intention.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
