import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { Sheet } from './Sheet';
import { useTrackerStore, RunType } from '@/store/trackerStore';

const TABS: [RunType, string][] = [
  ['open', 'Open'],
  ['distance', 'Distance'],
  ['interval', 'Interval'],
];
const DISTANCE_PRESETS = [3, 5, 10, 15];

// Matches Tracker (new).html's runSetupSheet().
export function RunSetupSheet() {
  const {
    runSetupOpen,
    closeRunSetup,
    runType,
    selectRunType,
    distanceGoal,
    distanceCustom,
    customDistanceVal,
    selectDistanceGoal,
    openCustomDistance,
    adjustCustomDistance,
    intervalMeters,
    intervalReps,
    incIntervalMeters,
    decIntervalMeters,
    incIntervalReps,
    decIntervalReps,
    startRunFromSetup,
  } = useTrackerStore();

  return (
    <Sheet visible={runSetupOpen} onClose={closeRunSetup} title="Run Setup" zIndex={45}>
      <Text style={typography.kicker}>Run Type</Text>
      <View style={styles.segPill}>
        {TABS.map(([id, label]) => {
          const active = runType === id;
          return (
            <Pressable key={id} style={[styles.segItem, active && styles.segItemActive]} onPress={() => selectRunType(id)}>
              <Text style={[styles.segItemText, active && styles.segItemTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {runType === 'open' && <Text style={styles.desc}>Track distance, pace and time freely with no target — stop whenever you like.</Text>}

      {runType === 'distance' && (
        <View style={{ gap: 12 }}>
          <Text style={typography.kicker}>Distance Goal</Text>
          <View style={styles.chipRow}>
            {DISTANCE_PRESETS.map((d) => {
              const selected = !distanceCustom && distanceGoal === d;
              return (
                <Pressable key={d} style={[styles.chip, selected && styles.chipSelected]} onPress={() => selectDistanceGoal(d)}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d} km</Text>
                </Pressable>
              );
            })}
            <Pressable style={[styles.chip, distanceCustom && styles.chipSelected]} onPress={openCustomDistance}>
              <Text style={[styles.chipText, distanceCustom && styles.chipTextSelected]}>Custom</Text>
            </Pressable>
          </View>
          {distanceCustom && (
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepBtn} onPress={() => adjustCustomDistance(-1)}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <View style={styles.intervalVal}>
                <Text style={styles.intervalValText}>{customDistanceVal} km</Text>
              </View>
              <Pressable style={styles.stepBtn} onPress={() => adjustCustomDistance(1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {runType === 'interval' && (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 5 }}>
            <Text style={typography.kicker}>Interval Distance</Text>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepBtn} onPress={decIntervalMeters}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <View style={styles.intervalVal}>
                <Text style={styles.intervalValText}>{intervalMeters} m</Text>
              </View>
              <Pressable style={styles.stepBtn} onPress={incIntervalMeters}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ gap: 5 }}>
            <Text style={typography.kicker}>Reps</Text>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepBtn} onPress={decIntervalReps}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <View style={styles.intervalVal}>
                <Text style={styles.intervalValText}>{intervalReps}× reps</Text>
              </View>
              <Pressable style={styles.stepBtn} onPress={incIntervalReps}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.desc}>
            {intervalReps} × {intervalMeters}m = {((intervalMeters * intervalReps) / 1000).toFixed(2)} km total
          </Text>
        </View>
      )}

      <Pressable style={styles.primaryPill} onPress={startRunFromSetup}>
        <Text style={styles.primaryPillText}>Start Run</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  segPill: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segItemActive: { backgroundColor: colors.bg },
  segItemText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.neutral500 },
  segItemTextActive: { color: colors.text },
  desc: { fontSize: 13, color: colors.neutral500, fontFamily: fonts.regular, lineHeight: 19 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexGrow: 1, minWidth: 56, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.bg },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 34, height: 38, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 17, color: colors.text },
  intervalVal: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.surface },
  intervalValText: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  primaryPill: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  primaryPillText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
