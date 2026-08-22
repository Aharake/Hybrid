import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon } from '@/icons';
import { rcCenterRing, rcCurvedLine } from '@/engine/ringGeometry';
import { useTrackerStore, RING_DATA_BASE } from '@/store/trackerStore';
import { viewSeedFor, varyValue } from '@/engine/metricVariance';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 140;

// Ambient glow behind each ring — the source uses a CSS blur filter on plain divs,
// which has no direct RN equivalent; a soft radial-gradient blob (react-native-svg,
// well-supported) reads the same at this scale. See plan's noted glow fallback.
function GlowBlob({ width, height, color, style }: { width: number; height: number; color: string; style?: object }) {
  const id = `glow-${color.replace(/[^a-zA-Z0-9]/g, '')}-${width}x${height}`;
  return (
    <View style={[{ width, height, position: 'absolute' }, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function CenterRing({ pct }: { pct: number }) {
  const geo = rcCenterRing(pct, SIZE);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct, { duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: geo.circumference - geo.circumference * (progress.value / 100),
  }));
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={geo.cx} cy={geo.cy} r={geo.radius} fill="none" stroke={colors.rcGoalDim} strokeWidth={geo.strokeWidth} />
      <AnimatedCircle
        cx={geo.cx}
        cy={geo.cy}
        r={geo.radius}
        fill="none"
        stroke={colors.rcGoal}
        strokeWidth={geo.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={geo.circumference}
        animatedProps={animatedProps}
        rotation={-90}
        origin={`${geo.cx}, ${geo.cy}`}
      />
    </Svg>
  );
}

function CurvedLine({ pct, side, color, dimColor }: { pct: number; side: 'left' | 'right'; color: string; dimColor: string }) {
  const geo = rcCurvedLine(pct, SIZE, side);
  return (
    <Svg width={geo.viewBox.w} height={geo.viewBox.h} viewBox={`${geo.viewBox.x} ${geo.viewBox.y} ${geo.viewBox.w} ${geo.viewBox.h}`}>
      <Path d={geo.trackPath} fill="none" stroke={dimColor} strokeWidth={geo.strokeWidth} strokeLinecap="round" />
      <Path d={geo.progPath} fill="none" stroke={color} strokeWidth={geo.strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

// Matches Tracker (new).html's ringCluster()/getViewRingData(). Ring values vary
// deterministically when viewing a non-today day (same seeded-variance pattern as
// engine/metricVariance.ts, ported inline here since it uses its own base values).
export function useViewRingData() {
  const { viewWeekOffset, viewDay, isViewingToday } = useTrackerStore();
  if (isViewingToday()) return RING_DATA_BASE;
  const seed = viewSeedFor(viewWeekOffset, viewDay);
  return {
    goal: Math.min(1, Math.max(0, varyValue(RING_DATA_BASE.goal, seed, '_goal', 0.4))),
    consistency: Math.min(1, Math.max(0, varyValue(RING_DATA_BASE.consistency, seed, '_consistency', 0.25))),
    volume: Math.max(0, varyValue(RING_DATA_BASE.volume, seed, '_volume', 0.45)),
  };
}

export function RingCluster() {
  const openMetricDetail = useTrackerStore((s) => s.openMetricDetail);
  const data = useViewRingData();

  return (
    <View style={styles.card}>
      <View style={styles.ringsRow}>
        <GlowBlob width={56} height={16} color={colors.rcConsistency} style={{ left: 8 }} />
        <GlowBlob width={110} height={24} color={colors.rcGoal} style={{ left: '50%', marginLeft: -55 }} />
        <GlowBlob width={56} height={16} color={colors.rcVolume} style={{ right: 8 }} />

        <View style={styles.sideText}>
          <Text style={[styles.sideNum, { color: colors.rcConsistency }]}>{Math.round(data.consistency * 100)}</Text>
        </View>
        <View style={styles.centerWrap}>
          <CurvedLine pct={data.consistency} side="left" color={colors.rcConsistency} dimColor={colors.rcConsistencyDim} />
        </View>
        <View style={styles.centerWrap}>
          <CenterRing pct={data.goal * 100} />
          <View style={styles.centerNumWrap}>
            <Text style={[styles.centerNum, { color: colors.rcGoal }]}>{Math.round(data.goal * 100)}</Text>
          </View>
        </View>
        <View style={styles.centerWrap}>
          <CurvedLine pct={data.volume} side="right" color={colors.rcVolume} dimColor={colors.rcVolumeDim} />
        </View>
        <View style={styles.sideText}>
          <Text style={[styles.sideNum, { color: colors.rcVolume }]}>
            {Math.round(data.volume * 100)}
            <Text style={styles.sidePct}>%</Text>
          </Text>
        </View>
      </View>

      <View style={styles.labelsRow}>
        <Pressable style={styles.labelItem} onPress={() => openMetricDetail('consistency')}>
          <Text style={styles.labelText}>CONSISTENCY</Text>
          <TrChevRightIcon size={9} color={colors.text} />
        </Pressable>
        <Pressable style={styles.labelItem} onPress={() => openMetricDetail('goal')}>
          <Text style={styles.labelText}>WEEKLY GOAL</Text>
          <TrChevRightIcon size={9} color={colors.text} />
        </Pressable>
        <Pressable style={styles.labelItem} onPress={() => openMetricDetail('volume')}>
          <Text style={styles.labelText}>VOLUME TREND</Text>
          <TrChevRightIcon size={9} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, paddingTop: 16, paddingBottom: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.divider },
  ringsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideText: { width: 40, alignItems: 'center' },
  sideNum: { fontFamily: fonts.semiBold, fontSize: 18 },
  sidePct: { fontSize: 11 },
  centerWrap: { position: 'relative' },
  centerNumWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerNum: { fontFamily: fonts.semiBold, fontSize: 32, lineHeight: 34 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  labelItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 2 },
  labelText: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.text, letterSpacing: 0.2, textAlign: 'center' },
});
