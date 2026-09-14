import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BarbellIcon, RunIcon } from '@/icons';
import { colors } from '@/theme/tokens';
import type { Discipline, Dow } from '@/engine/schedule';

export const CHIP_SIZE = 44;

interface Point {
  x: number;
  y: number;
}

interface DropHit {
  day: Dow;
  center: Point;
}

interface Props {
  type: Discipline;
  // Spawn point (chip center), in the overlay's own local coordinate space —
  // see ScheduleScreen for how that space is established.
  origin: Point;
  // Given the chip's current center (same coordinate space as `origin`),
  // returns the day cell it's over (and that cell's center, to snap to) or
  // null if it isn't over a valid, still-empty cell. Pure JS, called on the
  // JS thread once the finger lifts — not a worklet.
  resolveDrop: (center: Point) => DropHit | null;
  // Called once the chip has finished animating into a cell — this is where
  // the caller actually commits the day to the schedule and removes this
  // chip from its pending list.
  onDropped: (day: Dow) => void;
}

export function DraggableDayChip({ type, origin, resolveDrop, onDropped }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (dx: number, dy: number) => {
    const hit = resolveDrop({ x: origin.x + dx, y: origin.y + dy });
    if (hit) {
      translateX.value = withSpring(hit.center.x - origin.x, { damping: 15, stiffness: 160 });
      translateY.value = withSpring(hit.center.y - origin.y, { damping: 15, stiffness: 160 }, (finished) => {
        if (!finished) return;
        scale.value = withTiming(0.55, { duration: 120 });
        opacity.value = withTiming(0, { duration: 160 }, (done) => {
          if (done) runOnJS(onDropped)(hit.day);
        });
      });
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 160 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 160 });
    }
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.14, { damping: 12 });
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(handleEnd)(e.translationX, e.translationY);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.chip, { left: origin.x - CHIP_SIZE / 2, top: origin.y - CHIP_SIZE / 2 }, style]}>
        {type === 'strength' ? <BarbellIcon size={18} color="#000" /> : <RunIcon size={18} color={colors.blue} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
