import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/trackerTokens';
import { useAchievements } from '@/hooks/useStats';
import { useAuthStore } from '@/store/authStore';
import { useTrackerStore } from '@/store/trackerStore';
import type { BadgeItem } from '@/engine/achievements';
import { AchievementBadge } from './AchievementBadge';

type Popup = { badge: BadgeItem; shape: 'hex' | 'disc'; group: string };

const KEY = (userId: string) => `hyvo.achievements.seen.${userId}`;

// Watches the achievements the account has earned and shows a popup for each new
// one. Which ones have already been celebrated is remembered on the device, and
// the first time an account is seen everything it already has is marked as seen
// (otherwise signing in on a new phone would replay every past badge).
export function AchievementPopup() {
  const { milestones, records, firsts } = useAchievements();
  const accountLoaded = useTrackerStore((s) => s.accountLoaded);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // undefined = still reading from the device, null = nothing stored yet.
  const [seen, setSeen] = useState<Set<string> | null | undefined>(undefined);
  const [queue, setQueue] = useState<Popup[]>([]);

  const earned = useMemo<Popup[]>(
    () => [
      ...milestones.filter((b) => b.earned).map((badge) => ({ badge, shape: 'hex' as const, group: 'Run milestone' })),
      ...records.filter((b) => b.earned).map((badge) => ({ badge, shape: 'hex' as const, group: 'Personal record' })),
      ...firsts.filter((b) => b.earned).map((badge) => ({ badge, shape: 'disc' as const, group: 'First' })),
    ],
    [milestones, records, firsts],
  );

  useEffect(() => {
    setSeen(undefined);
    if (!userId) return;
    let cancelled = false;
    SecureStore.getItemAsync(KEY(userId))
      .then((v) => {
        if (!cancelled) setSeen(v ? new Set<string>(JSON.parse(v)) : null);
      })
      .catch(() => {
        if (!cancelled) setSeen(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !accountLoaded || seen === undefined) return;
    const persist = (ids: Set<string>) => SecureStore.setItemAsync(KEY(userId), JSON.stringify([...ids])).catch(() => {});
    if (seen === null) {
      const baseline = new Set(earned.map((e) => e.badge.id));
      setSeen(baseline);
      persist(baseline);
      return;
    }
    const fresh = earned.filter((e) => !seen.has(e.badge.id));
    if (!fresh.length) return;
    const next = new Set(seen);
    fresh.forEach((e) => next.add(e.badge.id));
    setSeen(next);
    persist(next);
    setQueue((q) => [...q, ...fresh]);
  }, [earned, accountLoaded, seen, userId]);

  const current = queue[0];
  if (!current) return null;
  return <PopupCard key={current.badge.id} item={current} remaining={queue.length - 1} onClose={() => setQueue((q) => q.slice(1))} />;
}

function PopupCard({ item, remaining, onClose }: { item: Popup; remaining: number; onClose: () => void }) {
  const scale = useSharedValue(0.7);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 11, stiffness: 140 });
  }, [fade, scale]);
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const card = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.backdrop, backdrop]}>
      <Animated.View style={[styles.card, card]}>
        <Text style={styles.kicker}>NEW ACHIEVEMENT</Text>
        <View style={styles.badgeWrap}>
          <AchievementBadge item={{ ...item.badge, tier: item.badge.tier === 'locked' ? 'outline' : item.badge.tier }} shape={item.shape} size={120} />
        </View>
        <Text style={styles.group}>{item.group}</Text>
        {remaining > 0 && <Text style={styles.more}>+{remaining} more to see</Text>}
        <Pressable style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>{remaining > 0 ? 'Next' : 'Nice'}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 90 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: 30, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 6 },
  kicker: { fontFamily: fonts.semiBold, fontSize: 11.5, letterSpacing: 1.6, color: colors.green },
  badgeWrap: { marginVertical: 18 },
  group: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500 },
  more: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500, marginTop: 2 },
  btn: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 14, marginTop: 18 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
});
