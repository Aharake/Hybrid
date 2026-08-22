import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Matches Onboarding.html's .bars-wrap (motivation-2 screen) — 6 bars growing in on mount.
const BARS = [
  { pct: 28, delayMs: 50 },
  { pct: 46, delayMs: 150 },
  { pct: 38, delayMs: 250 },
  { pct: 68, delayMs: 350 },
  { pct: 58, delayMs: 450 },
  { pct: 92, delayMs: 550 },
];

const CONTENT_HEIGHT = 56; // .bars-wrap content-box height (120 total minus 56/8 top/bottom padding)

function Bar({ pct, delayMs }: { pct: number; delayMs: number }) {
  const progress = useSharedValue(0);
  const height = (pct / 100) * CONTENT_HEIGHT;

  useEffect(() => {
    progress.value = withDelay(delayMs, withTiming(1, { duration: 700 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleY: progress.value }],
  }));

  return (
    <Animated.View style={[styles.bar, { height, transformOrigin: 'bottom' }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`barGrad-${pct}-${delayMs}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="100%" stopColor="#9a9a9e" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#barGrad-${pct}-${delayMs})`} />
      </Svg>
    </Animated.View>
  );
}

export function BarsChart() {
  return (
    <View style={styles.wrap}>
      {BARS.map((b, i) => (
        <Bar key={i} pct={b.pct} delayMs={b.delayMs} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    height: 120,
    paddingTop: 56,
    paddingBottom: 8,
  },
  bar: {
    width: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
});
