import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrPlayIcon } from '@/icons';

interface Props {
  dayLabel: string;
  name: string;
  meta: string;
  active: boolean;
  isLast: boolean;
  showStart?: boolean;
  onPress: () => void;
}

// Matches Tracker (new).html's .tl-day / .tl-card (Strength's weekly program timeline).
export function SessionTimelineCard({ dayLabel, name, meta, active, isLast, showStart, onPress }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.lineWrap}>
        <View style={[styles.dot, active && styles.dotActive]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <Pressable onPress={onPress} style={[styles.card, active && styles.cardActive]}>
        <Text style={[styles.dayLbl, active && styles.dayLblActive]}>{dayLabel}</Text>
        <Text style={[styles.name, active && styles.nameActive]}>{name}</Text>
        <Text style={[styles.meta, active && styles.metaActive]}>{meta}</Text>
        {showStart && (
          <View style={styles.startBtn}>
            <TrPlayIcon size={13} color={colors.text} />
            <Text style={styles.startText}>Start Workout</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  lineWrap: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.neutral300, marginTop: 18 },
  dotActive: { backgroundColor: colors.strength, width: 14, height: 14, borderRadius: 7 },
  line: { width: 2, flex: 1, backgroundColor: colors.divider, marginTop: 4, minHeight: 16 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  cardActive: { backgroundColor: colors.text },
  dayLbl: { fontSize: 10, color: colors.neutral500, textTransform: 'uppercase', fontFamily: fonts.semiBold, letterSpacing: 0.2 },
  dayLblActive: { color: colors.bg, opacity: 0.5 },
  name: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, marginTop: 4 },
  nameActive: { color: colors.bg },
  meta: { fontSize: 11, color: colors.neutral500, marginTop: 4 },
  metaActive: { color: colors.bg, opacity: 0.5 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginTop: 10, alignSelf: 'flex-start' },
  startText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text },
});
