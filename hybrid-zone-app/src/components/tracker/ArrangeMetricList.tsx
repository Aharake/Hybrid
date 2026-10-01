import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { MetricIcon } from './iconMap';

export interface ArrangeItem {
  id: string;
  icon?: string;
  label: string;
  value: string;
}

const ROW_H = 56;
const ROW_GAP = 8;
const PITCH = ROW_H + ROW_GAP; // vertical distance between one row's slot and the next

interface RowProps {
  item: ArrangeItem;
  index: number;
  total: number;
  isActive: boolean;
  dragY: ReturnType<typeof useSharedValue<number>>;
  onGrab: () => void;
  onRelease: (fromIndex: number, toIndex: number) => void;
}

function Handle() {
  return (
    <View style={styles.handle}>
      <View style={styles.handleBar} />
      <View style={styles.handleBar} />
      <View style={styles.handleBar} />
    </View>
  );
}

function Row({ item, index, total, isActive, dragY, onGrab, onRelease }: RowProps) {
  // Grabbing a row commits nothing on its own — only onEnd below ever reorders
  // the list, synchronously via runOnJS (the same safe pattern used for the
  // onboarding day chips), never from inside an animation's own callback.
  const gesture = Gesture.Pan()
    .onBegin(() => {
      dragY.value = 0;
      onGrab();
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
    })
    .onEnd((e) => {
      const raw = index + e.translationY / PITCH;
      const toIndex = Math.max(0, Math.min(total - 1, Math.round(raw)));
      // Settles the row onto its target slot first; the list itself only
      // reorders ~180ms later (onRelease, delayed by a plain JS setTimeout —
      // see RunTrackerOverlay's SlideToStart for why that must happen on the
      // JS side rather than chained off the animation), so by the time the
      // row's position actually changes, this offset already matches it and
      // nothing visibly jumps.
      dragY.value = withSpring((toIndex - index) * PITCH, { damping: 22, stiffness: 300 });
      onRelease(index, toIndex);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? dragY.value : 0 }],
    zIndex: isActive ? 10 : 0,
  }));

  return (
    <Animated.View style={[styles.row, isActive && styles.rowActive, style]}>
      {!!item.icon && <MetricIcon id={item.icon} size={14} color={colors.neutral500} />}
      <Text style={styles.label} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {item.value}
      </Text>
      <GestureDetector gesture={gesture}>
        <View hitSlop={10}>
          <Handle />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

// A vertical drag-to-reorder list — press and hold the handle on the right of
// a row, drag it up or down, and the rest of the stack catches up once you
// let go. `items` is the page's currently-visible tiles in their current
// order; `onReorder` is called with the new id order whenever a drag changes it.
export function ArrangeMetricList({ items, onReorder }: { items: ArrangeItem[]; onReorder: (ids: string[]) => void }) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragY = useSharedValue(0);

  // The visible set can change outside this component (toggling a tile off
  // while not mid-drag) — stay in sync with it.
  const idsKey = items.map((i) => i.id).join(',');
  useEffect(() => {
    setOrder(items.map((i) => i.id));
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  const handleRelease = (fromIndex: number, toIndex: number) => {
    setTimeout(() => {
      setActiveId(null);
      dragY.value = 0;
      if (fromIndex === toIndex) return;
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        onReorder(next);
        return next;
      });
    }, 220);
  };

  if (!items.length) return null;

  return (
    <View>
      {order.map((id, index) => {
        const item = byId[id];
        if (!item) return null;
        return (
          <Row key={id} item={item} index={index} total={order.length} isActive={activeId === id} dragY={dragY} onGrab={() => setActiveId(id)} onRelease={handleRelease} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_H,
    marginBottom: ROW_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  rowActive: { backgroundColor: colors.neutral300, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  value: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500, maxWidth: 90 },
  handle: { gap: 3, paddingVertical: 10, paddingHorizontal: 6 },
  handleBar: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.neutral500 },
});
