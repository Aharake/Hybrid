import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import { BarbellIcon, RunIcon, TrPaceIcon, TrTrendIcon } from '@/icons';
import type { OnboardingStackParamList } from '@/navigation/types';

type Kind = 'lift' | 'run' | 'rest';
const EXAMPLE_WEEK: { day: string; kind: Kind }[] = [
  { day: 'M', kind: 'lift' },
  { day: 'T', kind: 'run' },
  { day: 'W', kind: 'lift' },
  { day: 'T', kind: 'rest' },
  { day: 'F', kind: 'lift' },
  { day: 'S', kind: 'run' },
  { day: 'S', kind: 'rest' },
];

const BENEFITS = [
  { Icon: RunIcon, title: 'Runs that fit around your lifting', body: 'Hard runs are kept away from your heaviest leg days.' },
  { Icon: TrTrendIcon, title: 'Mileage that builds gradually', body: 'Distance climbs a little each week, with easier weeks built in.' },
  { Icon: TrPaceIcon, title: 'GPS tracking built in', body: 'Live pace, distance and route, saved with every run.' },
];

function DayCell({ day, kind, index }: { day: string; kind: Kind; index: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(150 + index * 110, withTiming(1, { duration: 420 }));
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }, { scale: 0.85 + 0.15 * progress.value }],
  }));
  return (
    <Animated.View style={[styles.cell, kind === 'lift' && styles.cellLift, kind === 'run' && styles.cellRun, style]}>
      <Text style={[styles.cellDay, kind !== 'rest' && { color: kind === 'lift' ? '#6e6e73' : 'rgba(255,255,255,0.75)' }]}>{day}</Text>
      {kind === 'lift' && <BarbellIcon size={15} color="#000" />}
      {kind === 'run' && <RunIcon size={15} color="#fff" />}
      {kind === 'rest' && <View style={styles.restDot} />}
    </Animated.View>
  );
}

export function RunningInterstitialScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'RunningInterstitial'>>();
  const { acceptRunning, declineRunning } = useOnboardingStore();

  return (
    <OnboardingScreen
      progress={66}
      footer={
        <>
          <PrimaryButton
            label="Yes, add running"
            onPress={() => {
              acceptRunning();
              navigation.navigate('RunningGoal');
            }}
          />
          <PrimaryButton
            label="No thanks"
            variant="ghost"
            onPress={() => {
              declineRunning();
              navigation.navigate('Schedule');
            }}
          />
        </>
      }
    >
      <View style={{ paddingTop: 20 }}>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Interested in running too?</Text>
        <Text style={typography.subtitle}>
          Hyvo can layer a running plan on top of your strength training. Same app, same week, no extra setup.
        </Text>
      </View>

      <View style={styles.weekCard}>
        <Text style={styles.weekLabel}>An example week</Text>
        <View style={styles.weekRow}>
          {EXAMPLE_WEEK.map((d, i) => (
            <DayCell key={i} day={d.day} kind={d.kind} index={i} />
          ))}
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendSwatch, { backgroundColor: '#fff' }]} />
          <Text style={styles.legendText}>Strength</Text>
          <View style={[styles.legendSwatch, { backgroundColor: colors.blue, marginLeft: 14 }]} />
          <Text style={styles.legendText}>Running</Text>
        </View>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map(({ Icon, title, body }) => (
          <View key={title} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Icon size={18} color={colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitBody}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  weekCard: { backgroundColor: colors.card, borderRadius: 24, padding: 16, marginTop: 24 },
  weekLabel: { ...typography.sectionLabel, marginBottom: 14 },
  weekRow: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 14,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cellLift: { backgroundColor: '#fff' },
  cellRun: { backgroundColor: colors.blue },
  cellDay: { fontFamily: fonts.bold, fontSize: 11, color: colors.textDimmer },
  restDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#48484a' },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3, marginRight: 6 },
  legendText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  benefits: { marginTop: 18, gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  benefitBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.textDim, marginTop: 2 },
});
