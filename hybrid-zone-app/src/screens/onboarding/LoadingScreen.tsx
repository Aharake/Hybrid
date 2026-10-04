import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PlanBuilder } from '@/components/onboarding/PlanBuilder';
import { Checklist, CHECKLIST_STEP_MS } from '@/components/onboarding/Checklist';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

export function LoadingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Loading'>>();
  const includeRunning = useOnboardingStore((s) => s.includeRunning);
  const schedule = useOnboardingStore((s) => s.schedule);

  const items = useMemo(() => {
    const list = ['Analyzing your profile', 'Building your strength plan'];
    if (includeRunning) list.push('Building your run plan');
    list.push('Scheduling your week');
    return list;
  }, [includeRunning]);

  return (
    <OnboardingScreen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Building your plan</Text>
        <Text style={styles.sub}>Fitting your sessions into your week.</Text>
        <PlanBuilder schedule={schedule} durationMs={items.length * CHECKLIST_STEP_MS} />
        <Checklist items={items} onComplete={() => navigation.replace('PlanPreview')} />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 18 },
  title: { fontFamily: fonts.extraBold, fontSize: 25, color: colors.text, marginBottom: 6, textAlign: 'center', letterSpacing: -0.4 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, marginBottom: 34, textAlign: 'center' },
});
