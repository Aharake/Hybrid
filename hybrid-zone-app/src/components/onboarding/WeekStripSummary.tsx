import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';
import { DAY_NAMES, DAY_ORDER, WeekSchedule } from '@/engine/schedule';
import { BarbellIcon, RunIcon, XIcon } from '@/icons';

interface Props {
  schedule: WeekSchedule;
}

// Matches Onboarding.html's weekStrip() (summary screen) wrapped in .week-card.
export function WeekStripSummary({ schedule }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.strip}>
        {DAY_ORDER.map((d) => {
          const c = schedule[d];
          const both = c.strength && c.running;
          const active = c.strength || c.running;
          return (
            <View key={d} style={[styles.cell, active && styles.cellFilled]}>
              <Text style={[styles.dayLabel, active && styles.dayLabelFilled]}>{DAY_NAMES[d]}</Text>
              <View style={styles.iconRow}>
                {both ? (
                  <>
                    <BarbellIcon size={13} color="#000" />
                    <RunIcon size={13} color={colors.blue} />
                  </>
                ) : c.strength ? (
                  <BarbellIcon size={13} color="#000" />
                ) : c.running ? (
                  <RunIcon size={13} color={colors.blue} />
                ) : (
                  <XIcon size={13} color="#48484a" />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  strip: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    aspectRatio: 0.7,
    borderRadius: 14,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cellFilled: { backgroundColor: colors.text },
  dayLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.textDimmer },
  dayLabelFilled: { color: '#6e6e73' },
  iconRow: { flexDirection: 'row', gap: 2 },
});
