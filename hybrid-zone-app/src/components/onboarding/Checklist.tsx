import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';
import { CheckIcon } from '@/icons';

const STEP_DURATION_MS = 750;
const COMPLETE_DELAY_MS = 700;

function Spinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return <Animated.View style={[styles.circle, styles.circleActiveRing, style]} />;
}

interface Props {
  items: string[];
  onComplete: () => void;
}

// Matches Onboarding.html's runLoadingSequence() (loading screen checklist).
export function Checklist({ items, onComplete }: Props) {
  const [doneCount, setDoneCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setDoneCount(i);
          setActiveIndex(i);
        }, i * STEP_DURATION_MS)
      );
    });
    const total = items.length * STEP_DURATION_MS;
    timers.push(
      setTimeout(() => {
        setDoneCount(items.length);
        setActiveIndex(-1);
      }, total)
    );
    timers.push(setTimeout(onComplete, total + COMPLETE_DELAY_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.list}>
      {items.map((label, i) => {
        const isDone = i < doneCount;
        const isActive = i === activeIndex;
        return (
          <View key={i} style={styles.item}>
            {isDone ? (
              <View style={[styles.circle, styles.circleDone]}>
                <CheckIcon size={15} color={colors.green} />
              </View>
            ) : isActive ? (
              <Spinner />
            ) : (
              <View style={styles.circle} />
            )}
            <Text style={[styles.label, (isDone || isActive) && styles.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', gap: 16, marginBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#333335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActiveRing: { borderTopColor: '#fff' },
  circleDone: { borderColor: colors.green },
  label: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textDimmer },
  labelActive: { color: colors.text },
});
