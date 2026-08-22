import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

interface Dot {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

// Ported from Onboarding.html's buildParticleCloud(n, R) (loading screen).
function buildParticleCloud(n: number, R: number): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2;
    const blob = 0.8 + 0.14 * Math.sin(theta * 3 + 1.3) + 0.08 * Math.sin(theta * 7 + 0.4) + (Math.random() - 0.5) * 0.14;
    const rr = Math.sqrt(Math.random()) * R * blob;
    const x = 110 + Math.cos(theta) * rr;
    const y = 110 + Math.sin(theta) * rr;
    const edge = Math.max(0.15, 1 - rr / R);
    const size = (0.7 + Math.random() * 1.9) * Math.max(0.4, edge + 0.25);
    const opacity = 0.22 + 0.5 * edge;
    dots.push({ x, y, r: size, opacity });
  }
  return dots;
}

// Matches Onboarding.html's .cloud-wrap: breathing scale + slow continuous rotation.
export function ParticleCloud() {
  const dots = useMemo(() => buildParticleCloud(550, 92), []);
  const breathe = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true);
    spin.value = withRepeat(withTiming(360, { duration: 60000, easing: Easing.linear }), -1, false);
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.97, 1.02]) }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.wrap, breatheStyle]}>
      <Animated.View style={spinStyle}>
        <Svg width={220} height={220} viewBox="0 0 220 220">
          {dots.map((d, i) => (
            <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity={d.opacity} />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
});
