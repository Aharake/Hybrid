import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { MetricIcon } from './iconMap';
import { TrCheckIcon } from '@/icons';

interface Props {
  icon?: string;
  label: string;
  value?: string | null;
  unit?: string;
  big?: boolean;
  bars?: number[];
  variant?: 'card' | 'strength'; // card = Home/Running's .metric-card, strength = .str-stat-card
  toggled?: boolean; // shows the orange check badge (ViewAllOverview toggle state)
  onPress?: () => void;
  widthPct?: number; // grid-span width as a percentage, for the wrapping row
}

// Matches Tracker (new).html's .metric-card / .str-stat-card, incl. the vao-badge
// toggle overlay used on ViewAllOverview.
export function MetricTile({ icon, label, value, unit, big, bars, variant = 'card', toggled, onPress, widthPct }: Props) {
  const Wrap = onPress ? Pressable : View;
  const sizeStyle: ViewStyle = widthPct !== undefined ? { width: `${widthPct}%` as ViewStyle['width'] } : { flex: 1 };

  if (variant === 'strength') {
    return (
      <Wrap onPress={onPress} style={[styles.strengthCard, sizeStyle]}>
        {toggled && (
          <View style={styles.badge}>
            <TrCheckIcon size={9} color="#fff" />
          </View>
        )}
        <Text style={styles.strengthVal}>{value}</Text>
        <Text style={styles.strengthLbl}>{label}</Text>
      </Wrap>
    );
  }

  return (
    <Wrap onPress={onPress} style={[styles.card, sizeStyle]}>
      {toggled && (
        <View style={styles.badge}>
          <TrCheckIcon size={9} color="#fff" />
        </View>
      )}
      <View style={styles.lblRow}>
        {!!icon && <MetricIcon id={icon} size={11} color={colors.neutral500} />}
        <Text style={styles.lbl}>{label}</Text>
      </View>
      {big && bars ? (
        <View style={styles.bars}>
          {bars.map((h, i) => (
            <View key={i} style={[styles.bar, { height: `${h}%` as ViewStyle['height'] }]} />
          ))}
        </View>
      ) : (
        <Text style={styles.val}>
          {value}
          {!!unit && <Text style={styles.unit}> {unit}</Text>}
        </Text>
      )}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 10, gap: 10, position: 'relative' },
  lblRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lbl: { fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.neutral500, fontFamily: fonts.regular },
  val: { fontSize: 19, color: colors.text, fontFamily: fonts.regular },
  unit: { fontSize: 11, color: colors.neutral500 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 28 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.secondary, minHeight: 2 },
  strengthCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 10, position: 'relative' },
  strengthVal: { fontFamily: fonts.semiBold, fontSize: 19, color: colors.text },
  strengthLbl: { fontSize: 9.5, color: colors.neutral500, marginTop: 4 },
  badge: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.strength, alignItems: 'center', justifyContent: 'center' },
});
