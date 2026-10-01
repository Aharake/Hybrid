import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon } from '@/icons';
import { useTrackerStore } from '@/store/trackerStore';
import { useRingValues } from '@/hooks/useStats';
import { CONSISTENCY_READY_DAYS, VOLUME_READY_DAYS } from '@/engine/stats';

// A tick-mark dial for the weekly goal and segmented bars for the other two
// measures — deliberately not concentric rings.
const SIZE = 190;
const TICKS = 44;
const ARC_START = 150; // degrees, measured clockwise from 3 o'clock — a 240° dial open at the bottom
const ARC_SPAN = 240;
const OUTER = SIZE / 2 - 4;
const INNER = OUTER - 15;
const SEGMENTS = 12;

// Smoothly tweens a plain JS number toward `target`, so the dial's ticks and
// the numbers light up together instead of jumping.
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

function Dial({ pct, color, dim }: { pct: number; color: string; dim: string }) {
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * TICKS);
  const c = SIZE / 2;
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {Array.from({ length: TICKS }, (_, i) => {
        const a = ((ARC_START + (ARC_SPAN * i) / (TICKS - 1)) * Math.PI) / 180;
        const on = i < lit;
        // The last lit tick is drawn a little longer, like a needle tip.
        const inner = on && i === lit - 1 ? INNER - 5 : INNER;
        return (
          <Line
            key={i}
            x1={c + inner * Math.cos(a)}
            y1={c + inner * Math.sin(a)}
            x2={c + OUTER * Math.cos(a)}
            y2={c + OUTER * Math.sin(a)}
            stroke={on ? color : dim}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function SegmentBar({ pct, color, dim }: { pct: number; color: string; dim: string }) {
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * SEGMENTS);
  return (
    <View style={styles.segRow}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i < lit ? color : dim }]} />
      ))}
    </View>
  );
}

function MeasureRow({
  label,
  value,
  pct,
  color,
  dim,
  ready,
  daysLeft,
  onPress,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  dim: string;
  ready: boolean;
  daysLeft: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.measure} onPress={onPress}>
      <View style={styles.measureTop}>
        <Text style={styles.measureLabel}>{label}</Text>
        <View style={styles.measureRight}>
          {ready ? (
            <Text style={styles.measureVal}>
              {Math.round(value)}
              <Text style={styles.measurePct}>%</Text>
            </Text>
          ) : (
            <Text style={styles.measureBuilding}>{daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}</Text>
          )}
          <TrChevRightIcon size={11} color={colors.neutral500} />
        </View>
      </View>
      <SegmentBar pct={ready ? pct : 0} color={color} dim={dim} />
    </Pressable>
  );
}

// The three values for the week the calendar is showing — computed from what
// was actually logged (see engine/stats.ts), so a week with nothing logged
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
      <Pressable style={styles.dialWrap} onPress={() => openMetricDetail('goal')}>
        <Dial pct={goalNum / 100} color={colors.rcGoal} dim={colors.rcGoalDim} />
        <View style={styles.dialCenter} pointerEvents="none">
          <Text style={styles.dialNum}>
            {Math.round(goalNum)}
            <Text style={styles.dialPct}>%</Text>
          </Text>
          <Text style={styles.dialCaption}>OF WEEKLY GOAL</Text>
        </View>
      </Pressable>

      <View style={styles.measures}>
        <MeasureRow
          label="CONSISTENCY"
          value={consistencyNum}
          pct={consistencyNum / 100}
          color={colors.rcConsistency}
          dim={colors.rcConsistencyDim}
          ready={data.consistencyReady}
          daysLeft={Math.max(0, CONSISTENCY_READY_DAYS - data.daysTracked)}
          onPress={() => openMetricDetail('consistency')}
        />
        <MeasureRow
          label="VOLUME TREND"
          value={volumeNum}
          pct={volumeNum / 100}
          color={colors.rcVolume}
          dim={colors.rcVolumeDim}
          ready={data.volumeReady}
          daysLeft={Math.max(0, VOLUME_READY_DAYS - data.daysTracked)}
          onPress={() => openMetricDetail('volume')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.divider, gap: 6 },
  dialWrap: { alignSelf: 'center', width: SIZE, height: SIZE - 34, overflow: 'hidden', alignItems: 'center' },
  dialCenter: { position: 'absolute', top: 58, alignItems: 'center', justifyContent: 'center' },
  dialNum: { fontFamily: fonts.semiBold, fontSize: 44, lineHeight: 48, color: colors.text, letterSpacing: -1 },
  dialPct: { fontSize: 20, color: colors.neutral500 },
  dialCaption: { fontFamily: fonts.semiBold, fontSize: 9.5, letterSpacing: 1, color: colors.neutral500, marginTop: 2 },
  measures: { gap: 14, marginTop: 12 },
  measure: { gap: 8 },
  measureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  measureLabel: { fontFamily: fonts.semiBold, fontSize: 10, letterSpacing: 0.8, color: colors.neutral500 },
  measureRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  measureVal: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  measurePct: { fontSize: 11, color: colors.neutral500 },
  measureBuilding: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500, fontStyle: 'italic' },
  segRow: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 8, borderRadius: 3 },
});
