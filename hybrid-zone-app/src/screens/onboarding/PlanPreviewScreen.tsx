import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import { buildPlanRows } from '@/engine/planPreview';
import type { OnboardingStackParamList } from '@/navigation/types';

function PlanCard({ title, sub, index }: { title: string; sub: string; index: number }) {
  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`planGrad-${index}`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#planGrad-${index})`} />
      </Svg>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      <Text style={styles.cardIndex}>{String(index).padStart(2, '0')}</Text>
    </View>
  );
}

export function PlanPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PlanPreview'>>();
  const { schedule, split, focus, equipment, strengthGoal, runningGoal } = useOnboardingStore();

  const rows = useMemo(
    () => buildPlanRows({ schedule, split: split || 'full_body', focus, equipment, strengthGoal, runningGoal }),
    [schedule, split, focus, equipment, strengthGoal, runningGoal]
  );

  return (
    <OnboardingScreen footer={<PrimaryButton label="Get my plan" onPress={() => navigation.navigate('Paywall')} />}>
      <View style={{ paddingTop: 22 }}>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Your plan is ready</Text>
        <Text style={typography.subtitle}>This is your roadmap to real progress.</Text>
      </View>
      <View style={styles.grid}>
        {rows.map((r, i) => (
          <PlanCard key={i} title={r.title} sub={r.sub} index={i + 1} />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12, marginTop: 14 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  cardBody: {},
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 18, letterSpacing: -0.2, color: colors.text },
  cardSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, marginTop: 4 },
  cardIndex: { fontFamily: fonts.serifItalicBold, fontSize: 28, color: 'rgba(255,255,255,0.45)' },
});
