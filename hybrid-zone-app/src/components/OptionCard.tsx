import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';

interface Props {
  label: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
  recommended?: boolean;
}

// Matches Onboarding.html's .option / Tracker.html's .split-card (same visual spec).
export function OptionCard({ label, desc, selected, onPress, recommended }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {recommended && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Recommended</Text>
          </View>
        )}
      </View>
      {!!desc && <Text style={[styles.desc, selected && styles.descSelected]}>{desc}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  cardSelected: { backgroundColor: colors.text },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  label: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2, color: colors.text },
  labelSelected: { color: '#000' },
  desc: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textDim, marginTop: 6 },
  descSelected: { color: '#48484a' },
  badge: {
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.greenText },
});
