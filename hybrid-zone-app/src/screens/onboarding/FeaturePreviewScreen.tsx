import React, { useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { PrimaryButton } from '@/components/PrimaryButton';
import { WeekStripSummary } from '@/components/onboarding/WeekStripSummary';
import { DialGauge, SegmentBar } from '@/components/tracker/RingGraphics';
import { MetricIcon } from '@/components/tracker/iconMap';
import { TrCheckIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/tokens';
import { colors as tc, fonts as tf } from '@/theme/trackerTokens';
import { emptyWeek, setDay } from '@/engine/schedule';
import type { OnboardingStackParamList } from '@/navigation/types';

// A tour of what's inside, shown after "Your plan is ready" and before the
// referral/payment steps. Each slide is a small drawn copy of the real screen
// (not a screenshot), so it always matches the app's look.

/* ---------------- the five previews ---------------- */

function RunPreview() {
  return (
    <View style={m.card}>
      <Svg width="100%" height={216} viewBox="0 0 300 216" preserveAspectRatio="xMidYMid slice">
        {/* faint street grid */}
        {[30, 80, 130, 180].map((y) => (
          <Path key={`h${y}`} d={`M0 ${y} H300`} stroke="#1c2029" strokeWidth={6} />
        ))}
        {[40, 105, 170, 235].map((x) => (
          <Path key={`v${x}`} d={`M${x} 0 V216`} stroke="#1c2029" strokeWidth={6} />
        ))}
        <Path d="M0 60 L300 150" stroke="#171b23" strokeWidth={9} />
        {/* the route: a dark casing under a heavier blue line */}
        <Path d="M34 178 C 70 160, 58 112, 108 102 S 172 134, 202 92 S 254 44, 274 58" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={13} strokeLinecap="round" />
        <Path d="M34 178 C 70 160, 58 112, 108 102 S 172 134, 202 92 S 254 44, 274 58" fill="none" stroke="#2f8cff" strokeWidth={8} strokeLinecap="round" />
        <Circle cx={34} cy={178} r={8} fill="#5dd67d" stroke="#0b0d11" strokeWidth={3} />
        <Circle cx={274} cy={58} r={8} fill="#fff" stroke="#2f8cff" strokeWidth={4} />
      </Svg>
      <View style={m.runStats}>
        {[
          ['5.02', 'KM'],
          ['28:14', 'TIME'],
          ['5\'37"', 'PACE'],
        ].map(([v, l]) => (
          <View key={l} style={{ alignItems: 'center' }}>
            <Text style={m.runVal}>{v}</Text>
            <Text style={m.runLbl}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RingsPreview() {
  return (
    <View style={[m.card, { paddingVertical: 20, paddingHorizontal: 22, gap: 14 }]}>
      <View style={{ alignItems: 'center' }}>
        <DialGauge size={200} pct={0.72} color={tc.rcGoal} dim={tc.rcGoalDim}>
          <Text style={m.dialNum}>
            72<Text style={m.dialPct}>%</Text>
          </Text>
          <Text style={m.dialCap}>OF WEEKLY GOAL</Text>
        </DialGauge>
      </View>
      {[
        ['CONSISTENCY', '83', 0.83, tc.rcConsistency, tc.rcConsistencyDim],
        ['VOLUME TREND', '104', 1, tc.rcVolume, tc.rcVolumeDim],
      ].map(([label, value, pct, color, dim]) => (
        <View key={label as string} style={{ gap: 8 }}>
          <View style={m.rowBetween}>
            <Text style={m.barLabel}>{label}</Text>
            <Text style={m.barVal}>{value}%</Text>
          </View>
          <SegmentBar pct={pct as number} color={color as string} dim={dim as string} />
        </View>
      ))}
    </View>
  );
}

function WorkoutPreview() {
  const rows = [
    { n: 1, prev: '60kg x 10', kg: '62.5', reps: '10', done: true },
    { n: 2, prev: '60kg x 8', kg: '62.5', reps: '9', done: true },
    { n: 3, prev: '57.5kg x 8', kg: '60', reps: '8', done: false },
  ];
  return (
    <View style={[m.card, { padding: 16, gap: 10 }]}>
      <Text style={m.exName}>Bench Press (Barbell)</Text>
      <View style={m.setHead}>
        <Text style={[m.setHeadText, { width: 34 }]}>SET</Text>
        <Text style={[m.setHeadText, { flex: 1.3 }]}>PREVIOUS</Text>
        <Text style={[m.setHeadText, { flex: 1 }]}>KG</Text>
        <Text style={[m.setHeadText, { flex: 1 }]}>REPS</Text>
        <View style={{ width: 34, alignItems: 'center' }}>
          <TrCheckIcon size={13} color={tc.neutral500} />
        </View>
      </View>
      {rows.map((r) => (
        <View key={r.n} style={m.setRow}>
          <View style={m.badge}>
            <Text style={m.badgeText}>{r.n}</Text>
          </View>
          <Text style={[m.prev, { flex: 1.3 }]}>{r.prev}</Text>
          <View style={[m.box, { flex: 1 }]}>
            <Text style={[m.boxText, { color: r.done ? tc.text : tc.neutral500 }]}>{r.kg}</Text>
          </View>
          <View style={[m.box, { flex: 1 }]}>
            <Text style={[m.boxText, { color: r.done ? tc.text : tc.neutral500 }]}>{r.reps}</Text>
          </View>
          <View style={[m.check, r.done && { backgroundColor: tc.green }]}>
            <TrCheckIcon size={15} color={r.done ? tc.bg : tc.neutral500} />
          </View>
        </View>
      ))}
    </View>
  );
}

function OverviewPreview() {
  const tiles: [string, string, string][] = [
    ['burn', 'WEEKLY BURN', '2,140 kcal'],
    ['active', 'ACTIVE', '48 min'],
    ['done', 'DONE', '4/5'],
    ['stepsIco', 'STEPS', '8,420'],
    ['flameIco', 'STREAK', '12 days'],
    ['layersIco', 'SETS THIS WK', '46'],
  ];
  return (
    <View style={[m.card, { padding: 14 }]}>
      <View style={m.grid}>
        {tiles.map(([icon, label, value]) => (
          <View key={label} style={m.tile}>
            <View style={m.tileHead}>
              <MetricIcon id={icon} size={11} color={tc.neutral500} />
              <Text style={m.tileLbl}>{label}</Text>
            </View>
            <Text style={m.tileVal}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SchedulePreview() {
  const schedule = useMemo(() => {
    let w = emptyWeek();
    w = setDay(w, 'mon', 'strength');
    w = setDay(w, 'tue', 'running');
    w = setDay(w, 'wed', 'strength');
    w = setDay(w, 'fri', 'strength');
    w = setDay(w, 'sat', 'running');
    return w;
  }, []);
  return (
    <View style={[m.card, { padding: 16, justifyContent: 'center' }]}>
      <WeekStripSummary schedule={schedule} />
      <Text style={m.scheduleNote}>3 lifts · 2 runs</Text>
    </View>
  );
}

const SLIDES: { title: string; tagline: string; Preview: React.ComponentType }[] = [
  { title: 'Run tracker', tagline: 'Every run, mapped.', Preview: RunPreview },
  { title: 'Rings', tagline: 'Weekly Goal, Consistency and Volume Trend.', Preview: RingsPreview },
  { title: 'Workout tracker', tagline: 'Log every set. Own every rep.', Preview: WorkoutPreview },
  { title: 'Overview tab', tagline: 'Your whole week at a glance.', Preview: OverviewPreview },
  { title: 'Schedule', tagline: 'Your week, planned.', Preview: SchedulePreview },
];

/* ---------------- the screen ---------------- */

export function FeaturePreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Features'>>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const next = () => {
    if (last) navigation.navigate('Referral');
    else scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }}>
        {SLIDES.map(({ title, tagline, Preview }) => (
          <View key={title} style={[styles.slide, { width }]}>
            <View style={styles.previewWrap}>
              <Preview />
            </View>
            <Text style={[typography.title, styles.slideTitle]}>{title}</Text>
            <Text style={[typography.subtitle, styles.slideTag]}>{tagline}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <PrimaryButton label={last ? 'Continue' : 'Next'} onPress={next} />
        {!last && <PrimaryButton label="Skip" variant="ghost" onPress={() => navigation.navigate('Referral')} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  slide: { paddingHorizontal: 24, paddingTop: 28, alignItems: 'center' },
  previewWrap: { width: '100%', marginBottom: 30 },
  slideTitle: { color: colors.text, textAlign: 'center', marginBottom: 8 },
  slideTag: { textAlign: 'center', paddingHorizontal: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.track },
  dotActive: { width: 20, backgroundColor: colors.text },
  footer: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 18 },
});

// Styles for the drawn previews (the tracker's own look).
const m = StyleSheet.create({
  card: { height: 340, borderRadius: 28, backgroundColor: tc.surface, overflow: 'hidden' },
  runStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: tc.bg },
  runVal: { fontFamily: tf.semiBold, fontSize: 24, color: tc.text },
  runLbl: { fontFamily: tf.semiBold, fontSize: 10, letterSpacing: 0.9, color: tc.neutral500, marginTop: 3 },
  dialNum: { fontFamily: tf.semiBold, fontSize: 48, lineHeight: 52, color: tc.text, letterSpacing: -1.5 },
  dialPct: { fontSize: 22, color: tc.neutral500 },
  dialCap: { fontFamily: tf.semiBold, fontSize: 10, letterSpacing: 1.1, color: tc.neutral500, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontFamily: tf.semiBold, fontSize: 10, letterSpacing: 0.8, color: tc.neutral500 },
  barVal: { fontFamily: tf.semiBold, fontSize: 16, color: tc.text },
  exName: { fontFamily: tf.semiBold, fontSize: 16, color: '#0a84ff', marginBottom: 4 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setHeadText: { fontFamily: tf.semiBold, fontSize: 10.5, letterSpacing: 0.6, color: tc.neutral500, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 34, height: 38, borderRadius: 11, backgroundColor: tc.bg, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: tf.bold, fontSize: 15, color: tc.text },
  prev: { fontFamily: tf.medium, fontSize: 14, color: tc.neutral500, textAlign: 'center' },
  box: { height: 38, borderRadius: 12, borderWidth: 1, borderColor: tc.neutral400, backgroundColor: tc.bg, alignItems: 'center', justifyContent: 'center' },
  boxText: { fontFamily: tf.semiBold, fontSize: 17 },
  check: { width: 34, height: 38, borderRadius: 11, backgroundColor: tc.bg, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: tc.bg, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14, gap: 12 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLbl: { fontFamily: tf.regular, fontSize: 9.5, letterSpacing: 0.4, color: tc.neutral500 },
  tileVal: { fontFamily: tf.semiBold, fontSize: 21, color: tc.text },
  scheduleNote: { fontFamily: tf.medium, fontSize: 13, color: tc.neutral500, textAlign: 'center', marginTop: 4 },
});
