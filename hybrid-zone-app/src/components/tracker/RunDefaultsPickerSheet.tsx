import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrCheckIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore, RunType } from '@/store/trackerStore';
import { fmtDistance } from '@/engine/units';

const TYPE_OPTIONS: [RunType, string, string][] = [
  ['open', 'Open', 'Track freely, no target'],
  ['distance', 'Distance Goal', 'Set a target distance'],
  ['interval', 'Interval', 'Set reps and distance per interval'],
];
const DISTANCE_PRESETS = [3, 5, 10, 15];

export function RunDefaultsPickerSheet() {
  const { runDefaultsPickerOpen, closeRunDefaultsPicker, runType, selectRunType, distanceGoal, selectDistanceGoal, unitSystem } = useTrackerStore();

  return (
    <Sheet visible={runDefaultsPickerOpen} onClose={closeRunDefaultsPicker} title="Run Defaults">
      <Text style={styles.kicker}>Default Run Type</Text>
      <View style={{ gap: 8 }}>
        {TYPE_OPTIONS.map(([id, label, sub]) => {
          const active = runType === id;
          return (
            <Pressable key={id} style={[styles.option, active && styles.optionActive]} onPress={() => selectRunType(id)}>
              <View>
                <Text style={styles.lbl}>{label}</Text>
                <Text style={styles.sub}>{sub}</Text>
              </View>
              {active && <TrCheckIcon size={15} color={colors.strength} />}
            </Pressable>
          );
        })}
      </View>
      {runType === 'distance' && (
        <View style={{ gap: 8 }}>
          <Text style={styles.kicker}>Default Distance</Text>
          <View style={styles.chipRow}>
            {DISTANCE_PRESETS.map((d) => {
              const active = distanceGoal === d;
              return (
                <Pressable key={d} style={[styles.chip, active && styles.chipActive]} onPress={() => selectDistanceGoal(d)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{fmtDistance(d, unitSystem, 0)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.neutral500, fontFamily: fonts.regular },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionActive: { backgroundColor: 'rgba(226,135,47,0.12)' },
  lbl: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
  sub: { fontSize: 11, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexGrow: 1, minWidth: 56, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.bg },
});
