import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, SharedValue, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';
import { BarbellIcon, RunIcon } from '@/icons';
import { DAY_NAMES, DAY_ORDER, Dow, WeekSchedule } from '@/engine/schedule';

// The plan-building animation: the person's own week assembles itself. A thin
// scan line sweeps across Mon → Sun, and as it passes each day that day's
// cell fills up with what's planned for it (a lift, a run, both, or rest).
// One shared 0→1 value drives everything, started once and left to finish —
// no loops, and nothing calls back into JS from the animation except the
// whole-number percentage label.

const CELL_H = 116;
const GAP = 6;
const SCAN_END = 0.96; // the scan line reaches the right edge here; the rest is a short settle
const COL_SPAN = 0.17; // how much of the run each day's fill takes

const LIFT = '#ffffff';
const RUN = colors.blue;

function DayColumn({ day, index, assignment, progress }: { day: Dow; index: number; assignment: { strength: boolean; running: boolean }; progress: SharedValue<number> }) {
  // Each day starts the moment the scan line reaches its left edge.
  const start = (SCAN_END / DAY_ORDER.length) * index;
  const both = assignment.strength && assignment.running;
  const rest = !assignment.strength && !assignment.running;

  const cellStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / COL_SPAN));
    return { transform: [{ scale: interpolate(t, [0, 0.55, 1], [1, 1.07, 1]) }] };
  });
  // The colour rises from the bottom of the cell, like it's filling up.
  const fillStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / COL_SPAN));
    return { transform: [{ translateY: (1 - t * (2 - t)) * CELL_H }] };
  });
  const iconStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / COL_SPAN));
    return { opacity: t, transform: [{ scale: interpolate(t, [0, 1], [0.5, 1]) }] };
  });
  const labelStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / COL_SPAN));
    return { opacity: 0.4 + 0.6 * t };
  });

  return (
    <View style={styles.col}>
      <Animated.Text style={[styles.dayLabel, labelStyle]}>{DAY_NAMES[day]}</Animated.Text>
      <Animated.View style={[styles.cell, cellStyle]}>
        {!rest && (
          <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
            {both ? (
              <>
                <View style={{ flex: 1, backgroundColor: LIFT }} />
                <View style={{ flex: 1, backgroundColor: RUN }} />
              </>
            ) : (
              <View style={{ flex: 1, backgroundColor: assignment.strength ? LIFT : RUN }} />
            )}
          </Animated.View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, styles.cellContent, iconStyle]}>
          {rest ? (
            <View style={styles.restDot} />
          ) : both ? (
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <View style={styles.half}>
                <BarbellIcon size={18} color="#000" />
              </View>
              <View style={styles.half}>
                <RunIcon size={18} color="#fff" />
              </View>
            </View>
          ) : assignment.strength ? (
            <BarbellIcon size={22} color="#000" />
          ) : (
            <RunIcon size={22} color="#fff" />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function PlanBuilder({ schedule, durationMs }: { schedule: WeekSchedule; durationMs: number }) {
  const progress = useSharedValue(0);
  const [rowWidth, setRowWidth] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.quad) });
  }, [durationMs, progress]);

  // Only the whole-number percentage reaches JS (≤ 100 updates in total).
  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (value, previous) => {
      if (value !== previous) runOnJS(setPct)(value);
    },
  );

  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.03, SCAN_END, 1], [0, 1, 1, 0], 'clamp'),
    transform: [{ translateX: Math.min(1, progress.value / SCAN_END) * rowWidth }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {DAY_ORDER.map((d, i) => (
          <DayColumn key={d} day={d} index={i} assignment={schedule[d]} progress={progress} />
        ))}
        <Animated.View pointerEvents="none" style={[styles.scan, scanStyle]} />
      </View>

      <Text style={styles.pct}>
        {pct}
        <Text style={styles.pctSign}>%</Text>
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', marginBottom: 34 },
  row: { width: '100%', flexDirection: 'row', gap: GAP, position: 'relative' },
  col: { flex: 1, gap: 8, alignItems: 'center' },
  dayLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4, color: colors.textDim },
  cell: {
    width: '100%',
    height: CELL_H,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.track,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  cellContent: { alignItems: 'center', justifyContent: 'center' },
  half: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  restDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#48484a' },
  scan: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -1,
    width: 2,
    borderRadius: 1,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  pct: { fontFamily: fonts.extraBold, fontSize: 56, lineHeight: 62, color: colors.text, letterSpacing: -2, marginTop: 30 },
  pctSign: { fontSize: 24, color: colors.textDim },
  track: { width: '100%', height: 3, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden', marginTop: 12 },
  bar: { height: 3, borderRadius: 2, backgroundColor: colors.text },
});
