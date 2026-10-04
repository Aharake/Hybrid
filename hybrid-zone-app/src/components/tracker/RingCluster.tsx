import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon, TrLockIcon } from '@/icons';
import { useTrackerStore } from '@/store/trackerStore';
import { useRingValues } from '@/hooks/useStats';
import { CONSISTENCY_READY_DAYS, VOLUME_READY_DAYS } from '@/engine/stats';
import { DialGauge, SegmentBar } from './RingGraphics';

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
            <View style={styles.locked}>
              <TrLockIcon size={12} color={colors.neutral500} />
              <Text style={styles.measureBuilding}>{daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}</Text>
            </View>
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
  const openGoalSetup = useTrackerStore((s) => s.openGoalSetup);
  const data = useViewRingData();
  const consistencyNum = useAnimatedNumber(data.consistency * 100);
  const goalNum = useAnimatedNumber(data.goalSetUp ? data.goal * 100 : 0);
  const volumeNum = useAnimatedNumber(data.volume * 100);

  // The first tap on the Weekly Goal is its setup; once that's done it opens
  // the usual breakdown (which has its own Edit button).
  const onGoalPress = () => (data.goalSetUp ? openMetricDetail('goal') : openGoalSetup());

  return (
    <View style={styles.card}>
      <Pressable style={styles.dialPress} onPress={onGoalPress}>
        <DialGauge pct={goalNum / 100} color={colors.rcGoal} dim={colors.rcGoalDim}>
          {data.goalSetUp ? (
            <>
              <Text style={styles.dialNum}>
                {Math.round(goalNum)}
                <Text style={styles.dialPct}>%</Text>
              </Text>
              <Text style={styles.dialCaption}>OF WEEKLY GOAL</Text>
            </>
          ) : (
            <>
              <Text style={[styles.dialNum, { color: colors.neutral400 }]}>—</Text>
              <Text style={styles.dialCaption}>WEEKLY GOAL · NO DATA YET</Text>
            </>
          )}
        </DialGauge>
      </Pressable>
      {!data.goalSetUp && (
        <Pressable style={styles.startBtn} onPress={openGoalSetup}>
          <Text style={styles.startBtnText}>Click to start</Text>
        </Pressable>
      )}

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
  dialPress: { alignSelf: 'center' },
  dialNum: { fontFamily: fonts.semiBold, fontSize: 44, lineHeight: 48, color: colors.text, letterSpacing: -1 },
  dialPct: { fontSize: 20, color: colors.neutral500 },
  dialCaption: { fontFamily: fonts.semiBold, fontSize: 9.5, letterSpacing: 1, color: colors.neutral500, marginTop: 2 },
  startBtn: { alignSelf: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22, marginTop: -2 },
  startBtnText: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.bg },
  measures: { gap: 14, marginTop: 12 },
  measure: { gap: 8 },
  measureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  measureLabel: { fontFamily: fonts.semiBold, fontSize: 10, letterSpacing: 0.8, color: colors.neutral500 },
  measureRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  measureVal: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  measurePct: { fontSize: 11, color: colors.neutral500 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  measureBuilding: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500 },
});
