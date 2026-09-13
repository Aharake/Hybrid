import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

const THUMB = 26;

interface ValueSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}

// Drag anywhere on the track (not just the thumb) to move it — the gesture
// is on the whole track View, and `e.x` is the touch position in the
// track's own coordinate space, so the same math handles both an initial
// tap-to-jump and continued dragging.
function ValueSlider({ value, min, max, step, onChange }: ValueSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const usableWidth = Math.max(1, trackWidth - THUMB);

  // Re-sync the thumb position when the track first measures, or when the
  // active page changes (switching to a different metric's slider) — not
  // on every value change from our own dragging, which would just be
  // redundant with what the gesture already set.
  useEffect(() => {
    if (trackWidth > 0) {
      const pct = (value - min) / (max - min);
      translateX.value = pct * usableWidth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackWidth]);

  const commit = (x: number) => {
    const pct = x / usableWidth;
    const raw = min + pct * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, stepped)));
  };

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      const x = Math.max(0, Math.min(usableWidth, e.x - THUMB / 2));
      translateX.value = x;
      runOnJS(commit)(x);
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(usableWidth, e.x - THUMB / 2));
      translateX.value = x;
      runOnJS(commit)(x);
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: translateX.value + THUMB / 2 }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        <View style={styles.trackBg} />
        <Animated.View style={[styles.trackFill, fillStyle]} />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

function MetricRow({ label, value, unit, step, min, max, onChange }: MetricRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>
          {value}
          <Text style={styles.rowUnit}> {unit}</Text>
        </Text>
      </View>
      <ValueSlider value={value} min={min} max={max} step={step} onChange={onChange} />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>{min}</Text>
        <Text style={styles.rangeLabel}>{max}</Text>
      </View>
    </View>
  );
}

export function BiometricsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Biometrics'>>();
  const { age, weightKg, heightCm, setField } = useOnboardingStore();

  const metrics: MetricRowProps[] = [
    { label: 'Age', value: age, unit: 'years', step: 1, min: 13, max: 90, onChange: (v) => setField('age', v) },
    { label: 'Height', value: heightCm, unit: 'cm', step: 1, min: 120, max: 220, onChange: (v) => setField('heightCm', v) },
    { label: 'Weight', value: weightKg, unit: 'kg', step: 1, min: 30, max: 220, onChange: (v) => setField('weightKg', v) },
  ];

  return (
    <OnboardingScreen progress={14} footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('StrengthGoal')} />}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>A few basics about you</Text>
      <Text style={[typography.subtitle, { marginBottom: 24 }]}>Drag each slider to set your age, height, and weight.</Text>

      {metrics.map((m) => (
        <MetricRow key={m.label} {...m} />
      ))}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 30 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  rowLabel: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  rowValue: { fontFamily: fonts.extraBold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  rowUnit: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim },
  track: { width: '100%', height: THUMB, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: colors.track },
  trackFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.text },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: '#000',
  },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  rangeLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer },
});
