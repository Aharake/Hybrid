import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon } from '@/icons';
import { useTrackerStore } from '@/store/trackerStore';
import { useRingValues } from '@/hooks/useStats';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 148;
const STROKE = 12;
const GAP = 5;

// Smoothly tweens a plain JS number toward `target` — used anywhere a value
// needs to animate but can't be driven by useAnimatedProps directly (SVG
// Path `d` strings, or a <Text> number that should count up/down in sync
// with a ring rather than jump).
function useAnimatedNumber(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(target, { duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  useAnimatedReaction(
    () => progress.value,
    (current) => runOnJS(setDisplay)(current),
  );
  return display;
}

// One ring of the concentric set. Index 0 is the outermost; each ring inward
// steps down by its own thickness plus a gap.
function RingLayer({ index, pct, color, dim }: { index: number; pct: number; color: string; dim: string }) {
  const r = SIZE / 2 - STROKE / 2 - 2 - index * (STROKE + GAP);
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, pct)), { duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={dim} strokeWidth={STROKE} />
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={c}
        animatedProps={animatedProps}
        rotation={-90}
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </>
  );
}

function LegendRow({ label, value, color, onPress }: { label: string; value: number; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.legendRow} onPress={onPress}>
      <View style={[styles.legendBar, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={[styles.legendVal, { color }]}>
          {Math.round(value)}
          <Text style={styles.legendPct}>%</Text>
        </Text>
      </View>
      <TrChevRightIcon size={12} color={colors.neutral500} />
    </Pressable>
  );
}

// The three ring values for the week the calendar is showing — computed from
// what was actually logged (see engine/stats.ts), so a week with nothing logged
// honestly reads 0%.
export function useViewRingData() {
  const viewWeekOffset = useTrackerStore((s) => s.viewWeekOffset);
  return useRingValues(viewWeekOffset);
}

export function RingCluster() {
  const openMetricDetail = useTrackerStore((s) => s.openMetricDetail);
  const data = useViewRingData();
  const consistencyNum = useAnimatedNumber(data.consistency * 100);
  const goalNum = useAnimatedNumber(data.goal * 100);
  const volumeNum = useAnimatedNumber(data.volume * 100);

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.ringsWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <RingLayer index={0} pct={data.goal} color={colors.rcGoal} dim={colors.rcGoalDim} />
            <RingLayer index={1} pct={data.consistency} color={colors.rcConsistency} dim={colors.rcConsistencyDim} />
            <RingLayer index={2} pct={data.volume} color={colors.rcVolume} dim={colors.rcVolumeDim} />
          </Svg>
          <View style={styles.centerNumWrap} pointerEvents="none">
            <Text style={styles.centerNum}>{Math.round(goalNum)}</Text>
            <Text style={styles.centerCaption}>GOAL</Text>
          </View>
        </View>

        <View style={styles.legend}>
          <LegendRow label="WEEKLY GOAL" value={goalNum} color={colors.rcGoal} onPress={() => openMetricDetail('goal')} />
          <View style={styles.legendDivider} />
          <LegendRow label="CONSISTENCY" value={consistencyNum} color={colors.rcConsistency} onPress={() => openMetricDetail('consistency')} />
          <View style={styles.legendDivider} />
          <LegendRow label="VOLUME TREND" value={volumeNum} color={colors.rcVolume} onPress={() => openMetricDetail('volume')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.divider },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringsWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  centerNumWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerNum: { fontFamily: fonts.semiBold, fontSize: 22, lineHeight: 24, color: colors.text },
  centerCaption: { fontFamily: fonts.semiBold, fontSize: 8.5, letterSpacing: 0.8, color: colors.neutral500, marginTop: 1 },
  legend: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  legendBar: { width: 4, height: 32, borderRadius: 2 },
  legendLabel: { fontFamily: fonts.semiBold, fontSize: 10, letterSpacing: 0.6, color: colors.neutral500 },
  legendVal: { fontFamily: fonts.semiBold, fontSize: 21, marginTop: 1 },
  legendPct: { fontSize: 12 },
  legendDivider: { height: 1, backgroundColor: colors.divider },
});
