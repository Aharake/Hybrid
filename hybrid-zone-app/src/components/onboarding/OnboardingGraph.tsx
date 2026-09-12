// Port of the "Onboarding Graph" Claude Design handoff (Curve mode, the
// design's default) — a looping animated chart showing running volume and
// strength volume rising together over a 12-week block. The source drives
// everything off one CSS keyframe timeline per SVG element; this ports that
// to a single 0->1 "progress" shared value that every visual property is
// interpolated from, which is the RN/Reanimated equivalent of the same
// idea. The rider dot's motion along the run curve is approximated via
// piecewise-linear interpolation between the curve's segment endpoints
// rather than true cubic-bezier point math — visually equivalent at this
// size, much simpler to get right.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { fonts } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

const TEXT = '#e9e9ed';
const ACCENT = '#9184d9';
const FADE = 'url(#gxFade)';

const RUN_LINE = 'M24 146 C 80 138, 98 124, 128 118 S 190 110, 216 92 S 300 76, 344 50';
const STR_LINE = 'M24 158 C 90 156, 112 146, 152 140 S 232 124, 268 106 S 322 90, 344 78';
const RUN_FILL = `${RUN_LINE} L344 172 L24 172 Z`;
const STR_FILL = `${STR_LINE} L344 172 L24 172 Z`;

// Endpoints of each C/S segment in RUN_LINE — good enough to approximate
// the rider's position along the curve.
const RUN_CHECKPOINTS: [number, number][] = [
  [24, 146],
  [128, 118],
  [216, 92],
  [344, 50],
];

function pointAlongRun(t: number): { x: number; y: number } {
  const segs = RUN_CHECKPOINTS.length - 1;
  const clamped = Math.min(Math.max(t, 0), 1) * segs;
  const i = Math.min(Math.floor(clamped), segs - 1);
  const localT = clamped - i;
  const [x1, y1] = RUN_CHECKPOINTS[i];
  const [x2, y2] = RUN_CHECKPOINTS[i + 1];
  return { x: x1 + (x2 - x1) * localT, y: y1 + (y2 - y1) * localT };
}

const CYCLE_MS = 5600;

export function OnboardingGraph() {
  const progress = useSharedValue(0);
  const [runVal, setRunVal] = useState(12);
  const [strVal, setStrVal] = useState(1);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
  }, [progress]);

  useAnimatedReaction(
    () => progress.value,
    (p) => {
      const k = Math.min(Math.max((p - 0.5) / 0.22, 0), 1);
      const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
      runOnJS(setRunVal)(Math.round(12 + 22 * e));
      runOnJS(setStrVal)(Math.round(1 + 3 * e));
    },
  );

  const gridProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0, 0.02, 0.12, 0.9, 0.98, 1], [0, 0, 1, 1, 0, 0]),
  }));
  const axisProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 0.14], [100, 0], 'clamp'),
    opacity: interpolate(progress.value, [0, 0.01, 0.04, 0.9, 0.98, 1], [0, 0, 1, 1, 0, 0]),
  }));
  const strFillProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0, 0.36, 0.68, 0.9, 0.98, 1], [0, 0, 0.7, 0.7, 0, 0]),
  }));
  const runFillProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 0.62, 0.9, 0.98, 1], [0, 0, 1, 1, 0, 0]),
  }));
  const strLineProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 0.16, 0.6], [100, 100, 0], 'clamp'),
    opacity: interpolate(progress.value, [0, 0.97, 1], [1, 1, 0]),
  }));
  const runLineProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 0.1, 0.52], [100, 100, 0], 'clamp'),
    opacity: interpolate(progress.value, [0, 0.97, 1], [1, 1, 0]),
  }));
  const riderProps = useAnimatedProps(() => {
    const t = interpolate(progress.value, [0, 0.1, 0.52], [0, 0, 1], 'clamp');
    const { x, y } = pointAlongRun(t);
    return {
      cx: x,
      cy: y,
      opacity: interpolate(progress.value, [0, 0.1, 0.13, 0.52, 0.58, 1], [0, 0, 1, 1, 0, 0]),
    };
  });
  const strTipProps = useAnimatedProps(() => ({
    r: interpolate(progress.value, [0, 0.5, 0.56, 0.6], [0.8, 0.8, 5.4, 4], 'clamp'),
    opacity: interpolate(progress.value, [0, 0.5, 0.56, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]),
  }));
  const runTipProps = useAnimatedProps(() => ({
    r: interpolate(progress.value, [0, 0.58, 0.64, 0.68], [1.1, 1.1, 7.4, 5.5], 'clamp'),
    opacity: interpolate(progress.value, [0, 0.58, 0.64, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]),
  }));
  const capProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 0.7, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]),
  }));

  return (
    <View style={styles.card}>
      <View style={styles.headline}>
        <Text style={styles.kicker}>Your 12-week block</Text>
        <Text style={styles.title}>Running and lifting, rising together.</Text>
      </View>

      <Svg viewBox="0 0 360 208" width="100%" height={196} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id="gxFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={TEXT} stopOpacity={0} />
            <Stop offset="0.18" stopColor={TEXT} stopOpacity={0.16} />
            <Stop offset="0.82" stopColor={TEXT} stopOpacity={0.16} />
            <Stop offset="1" stopColor={TEXT} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="gxRunFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ACCENT} stopOpacity={0.34} />
            <Stop offset="1" stopColor={ACCENT} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="gxStrFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={TEXT} stopOpacity={0.16} />
            <Stop offset="1" stopColor={TEXT} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <AnimatedG animatedProps={gridProps}>
          <Line x1={16} y1={40} x2={344} y2={40} stroke={FADE} strokeWidth={1} />
          <Line x1={16} y1={86} x2={344} y2={86} stroke={FADE} strokeWidth={1} />
          <Line x1={16} y1={132} x2={344} y2={132} stroke={FADE} strokeWidth={1} />
        </AnimatedG>
        <AnimatedLine
          x1={16}
          y1={172}
          x2={344}
          y2={172}
          stroke={FADE}
          strokeWidth={1.5}
          strokeDasharray="100"
          animatedProps={axisProps}
        />

        <AnimatedPath d={STR_FILL} fill="url(#gxStrFill)" animatedProps={strFillProps} />
        <AnimatedPath d={RUN_FILL} fill="url(#gxRunFill)" animatedProps={runFillProps} />
        <AnimatedPath
          d={STR_LINE}
          stroke={TEXT}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeOpacity={0.72}
          strokeDasharray="100"
          fill="none"
          animatedProps={strLineProps}
        />
        <AnimatedPath
          d={RUN_LINE}
          stroke={ACCENT}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray="100"
          fill="none"
          animatedProps={runLineProps}
        />
        <AnimatedCircle r={4.5} fill={ACCENT} animatedProps={riderProps} />
        <AnimatedCircle cx={344} cy={78} fill="#161826" stroke={TEXT} strokeWidth={2} strokeOpacity={0.72} animatedProps={strTipProps} />
        <AnimatedCircle cx={344} cy={50} fill={ACCENT} animatedProps={runTipProps} />

        <AnimatedG animatedProps={capProps}>
          <SvgText x={24} y={192} fontFamily={fonts.regular} fontSize={10} fill={TEXT} fillOpacity={0.38} letterSpacing={1.4}>
            WK 1
          </SvgText>
          <SvgText x={164} y={192} fontFamily={fonts.regular} fontSize={10} fill={TEXT} fillOpacity={0.38} letterSpacing={1.4}>
            WK 6
          </SvgText>
          <SvgText x={312} y={192} fontFamily={fonts.regular} fontSize={10} fill={TEXT} fillOpacity={0.38} letterSpacing={1.4}>
            WK 12
          </SvgText>
        </AnimatedG>
      </Svg>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View style={[styles.swatch, { backgroundColor: ACCENT }]} />
            <Text style={styles.statLabel}>Run volume</Text>
          </View>
          <Text style={styles.statVal}>
            {runVal} <Text style={styles.statUnit}>km /wk</Text>
          </Text>
        </View>
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View style={[styles.swatch, { backgroundColor: 'rgba(233,233,237,0.6)' }]} />
            <Text style={styles.statLabel}>Strength</Text>
          </View>
          <Text style={styles.statVal}>
            {strVal}× <Text style={styles.statUnit}>/wk</Text>
          </Text>
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.caption}>We ramp mileage and load in step, so neither one steals from the other.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  headline: { gap: 6 },
  kicker: { fontFamily: fonts.medium, fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: ACCENT },
  title: { fontFamily: fonts.medium, fontSize: 24, fontWeight: '500', lineHeight: 29, color: TEXT },
  statsRow: { flexDirection: 'row', gap: 28 },
  statCol: { gap: 4 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 18, height: 3, borderRadius: 2 },
  statLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(233,233,237,0.55)' },
  statVal: { fontFamily: fonts.medium, fontSize: 21, fontWeight: '500', color: TEXT },
  statUnit: { fontSize: 13, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.regular },
  divider: { height: 1, backgroundColor: 'rgba(233,233,237,0.14)' },
  caption: { fontSize: 13, lineHeight: 19, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.regular },
});
