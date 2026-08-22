import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { WeekStripSummary } from '@/components/onboarding/WeekStripSummary';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, radius, typography } from '@/theme/tokens';
import { BarbellIcon, GridIcon, LayersIcon, RunIcon, TargetIcon, TrendIcon } from '@/icons';
import { countDays } from '@/engine/schedule';
import type { OnboardingStackParamList } from '@/navigation/types';

const FOCUS_LABEL: Record<string, string> = {
  only_lower: 'Only lower',
  mainly_lower: 'Mainly lower',
  balanced: 'Balanced',
  mainly_upper: 'Mainly upper',
  only_upper: 'Only upper',
};
const GOAL_LABEL: Record<string, string> = { general: 'General fitness', strength: 'Build strength', muscle: 'Build muscle', tone: 'Tone & lose fat' };
const EQUIP_LABEL: Record<string, string> = { gym: 'Gym', dumbbells: 'Dumbbells only', bodyweight: 'Bodyweight only' };
const SPLIT_LABEL: Record<string, string> = { full_body: 'Full body', upper_lower: 'Upper / Lower', ppl: 'Push / Pull / Legs' };
const RUN_GOAL_LABEL: Record<string, string> = { first5k: 'First 5K', fun: 'Run for fun', faster: 'Get faster', further: 'Go further' };

function StatTile({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function SummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Summary'>>();
  const { schedule, includeRunning, focus, strengthGoal, equipment, split, customSplitLabel, runningGoal } =
    useOnboardingStore();

  const sN = countDays(schedule, 'strength');
  const rN = countDays(schedule, 'running');
  const total = sN + rN;
  const focusLabel = (focus && FOCUS_LABEL[focus]) || '—';
  const goalLabel = (strengthGoal && GOAL_LABEL[strengthGoal]) || '—';
  const equipLabel = (equipment && EQUIP_LABEL[equipment]) || '—';
  const splitLabel = split === 'custom' ? customSplitLabel || '—' : (split && SPLIT_LABEL[split]) || '—';
  const runGoalLabel = (runningGoal && RUN_GOAL_LABEL[runningGoal]) || '—';
  const potLabel = total >= 3 ? 'High' : total === 2 ? 'Medium' : 'Low';
  const potColor = total >= 3 ? colors.green : total === 2 ? colors.yellow : colors.red;

  return (
    <OnboardingScreen progress={99} footer={<PrimaryButton label="Generate my plan" onPress={() => navigation.navigate('Loading')} />}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Your plan, dialed in.</Text>
      <Text style={typography.subtitle}>Here's what we built around your answers.</Text>

      <View style={styles.hero}>
        <Text style={styles.heroNum}>{total}</Text>
        <Text style={styles.heroLabel}>SESSIONS / WEEK</Text>
        <Text style={styles.heroBreakdown}>
          {sN} strength{includeRunning ? ` · ${rN} running` : ''}
        </Text>
      </View>

      <WeekStripSummary schedule={schedule} />

      <View style={styles.grid}>
        <StatTile icon={<TargetIcon />} label="Goal" value={goalLabel} />
        {includeRunning && <StatTile icon={<RunIcon size={14} color={colors.text} />} label="Running goal" value={runGoalLabel} />}
        <StatTile icon={<LayersIcon />} label="Split" value={splitLabel} />
        <StatTile icon={<GridIcon />} label="Focus" value={focusLabel} />
        <StatTile icon={<BarbellIcon size={14} color={colors.text} />} label="Equipment" value={equipLabel} />
        <StatTile icon={<TrendIcon />} label="Progress potential" value={potLabel} valueColor={potColor} />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.card, borderRadius: 28, padding: 26, alignItems: 'center', marginTop: 22, marginBottom: 12 },
  heroNum: { fontFamily: fonts.serifItalicBold, fontSize: 44, lineHeight: 44, color: colors.text },
  heroLabel: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.textDim, marginTop: 6, letterSpacing: 0.3 },
  heroBreakdown: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDimmer, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tile: { width: '48%', backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  tileIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  tileLabel: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.textDim, marginBottom: 2 },
  tileValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text },
});
