import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';

// Illustrative 12-week block: load ramps for three weeks, dips for a deload,
// repeats, and finishes on a peak. The shape is the same for every goal (it's
// how the plan is periodised); the labels and headline number follow the goal
// the person picked. Bars use the same scaleY-in pattern as the old bars chart; nothing
// here loops or calls back into JS from the UI thread.
export type ProgressionGoal = 'general' | 'strength' | 'muscle' | 'tone';

const WEEKS = [38, 46, 55, 40, 58, 67, 76, 52, 78, 87, 95, 100];
const DELOAD = new Set([3, 7]);
const CHART_H = 132;
const GAP = 6;

interface GoalCopy {
  metric: string;
  headline: string;
  headlineSub: string;
  phases: { tag: string; title: string; body: string }[];
}

const COPY: Record<ProgressionGoal, GoalCopy> = {
  muscle: {
    metric: 'Weekly training volume',
    headline: '12 weeks',
    headlineSub: 'of volume that builds step by step',
    phases: [
      { tag: 'WK 1–3', title: 'Build the base', body: 'Sets and reps settle in at a load you can repeat.' },
      { tag: 'WK 4 & 8', title: 'Deload', body: 'Volume drops so your muscles can recover and grow.' },
      { tag: 'WK 9–12', title: 'Reach the peak', body: 'A few more sets per muscle each block, ending on your best week.' },
    ],
  },
  strength: {
    metric: 'Heaviest set per lift',
    headline: '12 weeks',
    headlineSub: 'of heavier lifts, planned around recovery',
    phases: [
      { tag: 'WK 1–3', title: 'Groove the lifts', body: 'Technique first, with room left in the tank.' },
      { tag: 'WK 4 & 8', title: 'Deload', body: 'Lighter week so the strength shows up after.' },
      { tag: 'WK 9–12', title: 'Reach the peak', body: 'Small weight jumps on the lifts that matter, ending on your best week.' },
    ],
  },
  tone: {
    metric: 'Weekly training output',
    headline: '12 weeks',
    headlineSub: 'of steady work that keeps your muscle',
    phases: [
      { tag: 'WK 1–3', title: 'Find your rhythm', body: 'Enough work to start, never so much you quit.' },
      { tag: 'WK 4 & 8', title: 'Deload', body: 'Recovery week that protects the muscle you have.' },
      { tag: 'WK 9–12', title: 'Reach the peak', body: 'Gradually more work while keeping your strength.' },
    ],
  },
  general: {
    metric: 'Weekly training load',
    headline: '12 weeks',
    headlineSub: 'of progress you can actually sustain',
    phases: [
      { tag: 'WK 1–3', title: 'Ease in', body: 'A manageable start you can keep up.' },
      { tag: 'WK 4 & 8', title: 'Deload', body: 'A lighter week so consistency lasts.' },
      { tag: 'WK 9–12', title: 'Reach the peak', body: 'Each block asks for a little more.' },
    ],
  },
};

function Bar({ index, height, width, deload }: { index: number; height: number; width: number; deload: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 70, withTiming(1, { duration: 650 }));
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleY: progress.value }] }));
  const last = index === WEEKS.length - 1;
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          backgroundColor: last ? colors.green : deload ? 'rgba(255,255,255,0.22)' : '#f2f2f7',
          transformOrigin: 'bottom',
        },
        style,
      ]}
    />
  );
}

export function ProgressionChart({ goal }: { goal: ProgressionGoal }) {
  const copy = COPY[goal];
  const [width, setWidth] = useState(0);
  const overlay = useSharedValue(0);

  useEffect(() => {
    overlay.value = withDelay(WEEKS.length * 70 + 300, withTiming(1, { duration: 500 }));
  }, [overlay]);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const barW = width > 0 ? (width - GAP * (WEEKS.length - 1)) / WEEKS.length : 0;
  const heights = WEEKS.map((v) => (v / 100) * CHART_H);
  const tops = heights.map((h, i) => ({ x: i * (barW + GAP) + barW / 2, y: CHART_H - h - 8 }));
  // Trend line through the tops of the build weeks only (skips the deload dips).
  const trend = tops.filter((_, i) => !DELOAD.has(i));
  const path = trend.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const end = tops[tops.length - 1];

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metric}>{copy.metric}</Text>
          <Text style={styles.big}>{copy.headline}</Text>
          <Text style={styles.bigSub}>{copy.headlineSub}</Text>
        </View>
      </View>

      <View style={styles.chart} onLayout={onLayout}>
        {width > 0 && (
          <>
            <View style={[styles.bars, { gap: GAP }]}>
              {heights.map((h, i) => (
                <Bar key={i} index={i} height={h} width={barW} deload={DELOAD.has(i)} />
              ))}
            </View>
            <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="none">
              <Svg width={width} height={CHART_H}>
                <Defs>
                  <LinearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#ffffff" stopOpacity={0.15} />
                    <Stop offset="1" stopColor={colors.green} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Path d={path} stroke="url(#trendGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Circle cx={end.x} cy={end.y} r={5} fill={colors.green} />
                <Circle cx={end.x} cy={end.y} r={9} fill={colors.green} fillOpacity={0.22} />
              </Svg>
            </Animated.View>
          </>
        )}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>WEEK 1</Text>
        <Text style={styles.axisText}>WEEK 12</Text>
      </View>
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: '#f2f2f7' }]} />
        <Text style={styles.legendText}>Build week</Text>
        <View style={[styles.swatch, { backgroundColor: 'rgba(255,255,255,0.22)', marginLeft: 14 }]} />
        <Text style={styles.legendText}>Deload week</Text>
      </View>

      <View style={styles.phases}>
        {copy.phases.map((p) => (
          <View key={p.tag} style={styles.phase}>
            <Text style={styles.phaseTag}>{p.tag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.phaseTitle}>{p.title}</Text>
              <Text style={styles.phaseBody}>{p.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>Illustrative example. Your real plan is built from your answers.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  headRow: { flexDirection: 'row', marginBottom: 18 },
  metric: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.8, color: colors.textDimmer, textTransform: 'uppercase' },
  big: { fontFamily: fonts.serifItalicBold, fontSize: 44, lineHeight: 50, color: colors.text, marginTop: 4 },
  bigSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDim, marginTop: 2 },
  chart: { height: CHART_H, justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_H },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    marginTop: 6,
    paddingTop: 8,
  },
  axisText: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.textDimmer, letterSpacing: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  swatch: { width: 10, height: 10, borderRadius: 3, marginRight: 6 },
  legendText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  phases: { marginTop: 22, gap: 10 },
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  phaseTag: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, color: colors.green, width: 72 },
  phaseTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  phaseBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.textDim, marginTop: 2 },
  disclaimer: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer, textAlign: 'center', marginTop: 16 },
});
