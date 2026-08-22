import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { ParticleCloud } from '@/components/onboarding/ParticleCloud';
import { Checklist } from '@/components/onboarding/Checklist';
import { TestimonialCard } from '@/components/onboarding/TestimonialCard';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

export function LoadingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Loading'>>();
  const includeRunning = useOnboardingStore((s) => s.includeRunning);

  const items = useMemo(() => {
    const list = ['Analyzing your profile', 'Building your strength plan'];
    if (includeRunning) list.push('Building your run plan');
    list.push('Scheduling your week');
    return list;
  }, [includeRunning]);

  return (
    <OnboardingScreen>
      <View style={styles.wrap}>
        <ParticleCloud />
        <Text style={styles.title}>Personalizing your plan</Text>
        <Text style={styles.sub}>Hang tight — this takes a few seconds.</Text>
        <Checklist items={items} onComplete={() => navigation.navigate('PlanPreview')} />
        <TestimonialCard />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 18 },
  title: { fontFamily: fonts.serifItalic, fontSize: 25, color: colors.text, marginBottom: 4, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, marginBottom: 26, textAlign: 'center' },
});
