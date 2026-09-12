import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

interface MetricPageProps {
  width: number;
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

function MetricPage({ width, label, value, unit, step, min, max, onChange }: MetricPageProps) {
  return (
    <View style={[styles.page, { width }]}>
      <Text style={styles.pageLabel}>{label}</Text>
      <View style={styles.valueBox}>
        <Text style={styles.valueNum}>{value}</Text>
        <Text style={styles.valueUnit}>{unit}</Text>
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
  const { width } = useWindowDimensions();
  const pageWidth = width - 48; // matches OnboardingScreen's 24px horizontal padding each side
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const pages = [
    { key: 'age', label: 'How old are you?', value: age, unit: 'years', step: 1, min: 13, max: 90, onChange: (v: number) => setField('age', v) },
    { key: 'weight', label: "What's your weight?", value: weightKg, unit: 'kg', step: 1, min: 30, max: 220, onChange: (v: number) => setField('weightKg', v) },
    { key: 'height', label: "What's your height?", value: heightCm, unit: 'cm', step: 1, min: 120, max: 220, onChange: (v: number) => setField('heightCm', v) },
  ];

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  const jumpTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * pageWidth, animated: true });
    setPage(i);
  };

  return (
    <OnboardingScreen progress={14} footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('StrengthGoal')} />}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>A few basics about you</Text>
      <Text style={[typography.subtitle, { marginBottom: 20 }]}>Swipe to move between age, weight, and height — drag the slider to set each one.</Text>

      <View style={styles.dots}>
        {pages.map((p, i) => (
          <Pressable key={p.key} hitSlop={10} onPress={() => jumpTo(i)}>
            <View style={[styles.dot, i === page && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ width: pageWidth }}
      >
        {pages.map((p) => (
          <MetricPage key={p.key} width={pageWidth} label={p.label} value={p.value} unit={p.unit} step={p.step} min={p.min} max={p.max} onChange={p.onChange} />
        ))}
      </ScrollView>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.track },
  dotActive: { backgroundColor: colors.text, width: 18 },
  page: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 4 },
  pageLabel: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text, marginBottom: 36 },
  valueBox: { alignItems: 'center', marginBottom: 44 },
  valueNum: { fontFamily: fonts.extraBold, fontSize: 56, color: colors.text, letterSpacing: -1 },
  valueUnit: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, marginTop: 2 },
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
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  rangeLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer },
});
