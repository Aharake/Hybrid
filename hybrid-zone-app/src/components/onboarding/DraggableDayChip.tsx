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
  // Called the instant a drop is accepted (JS thread, synchronous) — the
  // caller commits the day to the schedule right away and removes this chip
  // from its pending list shortly after (enough for the animation below to
  // be visible). Deliberately NOT wired through an animation callback: a
  // worklet callback chain here (spring -> callback -> timing -> callback ->
  // runOnJS) was the actual cause of a hard native crash previously, so the
  // animation below is fire-and-forget and carries no logic.
  onDropped: (day: Dow) => void;
  onCancelled: () => void;
}

// A neutral, saturated look (not the same white the day grid uses for an
// active cell, and not the dark of an empty one) so the chip stays visible
// while hovering over either — the earlier all-white chip could visually
// vanish against an already-active (also white) day cell.
const TINT: Record<Discipline, { bg: string; icon: string }> = {
  strength: { bg: colors.green, icon: colors.greenText },
  running: { bg: colors.blue, icon: '#fff' },
};

export function DraggableDayChip({ type, origin, resolveDrop, onDropped, onCancelled }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (dx: number, dy: number, moved: boolean) => {
    if (!moved) {
      // A tap rather than a drag — treat it as "never mind", not a drop.
      onCancelled();
      return;
    }
    const hit = resolveDrop({ x: origin.x + dx, y: origin.y + dy });
    if (hit) {
      translateX.value = withSpring(hit.center.x - origin.x, { damping: 15, stiffness: 160 });
      translateY.value = withSpring(hit.center.y - origin.y, { damping: 15, stiffness: 160 });
      scale.value = withTiming(0.5, { duration: 160 });
      opacity.value = withTiming(0, { duration: 220 });
      onDropped(hit.day);
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
      const moved = Math.abs(e.translationX) > 4 || Math.abs(e.translationY) > 4;
      runOnJS(handleEnd)(e.translationX, e.translationY, moved);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const tint = TINT[type];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.chip, { backgroundColor: tint.bg, left: origin.x - CHIP_SIZE / 2, top: origin.y - CHIP_SIZE / 2 }, style]}
      >
        {type === 'strength' ? <BarbellIcon size={18} color={tint.icon} /> : <RunIcon size={18} color={tint.icon} />}
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
