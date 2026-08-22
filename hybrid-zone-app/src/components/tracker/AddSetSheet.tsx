import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrClockIcon, TrPlusIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore } from '@/store/trackerStore';

// Matches Tracker (new).html's addSetSheet() — reached from ExerciseDetail's FAB /
// "Log Today's Workout" button (openDetailModal → openExercise(activeExerciseId)).
export function AddSetSheet() {
  const {
    activeExerciseId,
    findExerciseById,
    sets,
    weightInput,
    repsInput,
    setWeightInput,
    setRepsInput,
    incWeight,
    decWeight,
    incReps,
    decReps,
    addSet,
    closeExerciseModal,
  } = useTrackerStore();

  if (!activeExerciseId) return null;
  const ex = findExerciseById(activeExerciseId);
  if (!ex) return null;
  const exSets = sets[activeExerciseId] || [];

  return (
    <Sheet
      visible
      onClose={closeExerciseModal}
      headerExtra={
        <View>
          <Text style={styles.kicker}>{ex.sets} sets</Text>
          <Text style={styles.title}>{ex.name}</Text>
        </View>
      }
    >
      <View style={styles.prevRow}>
        <View style={styles.prevIco}>
          <TrClockIcon size={15} color={colors.neutral500} />
        </View>
        <View>
          <Text style={styles.stepperLbl}>Previous Session</Text>
          <Text style={styles.prevVal}>{ex.previous ? `${ex.previous} kg` : '—'}</Text>
        </View>
      </View>

      {exSets.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {exSets.map((s) => (
            <View key={s.num} style={styles.chip}>
              <Text style={[styles.stepperLbl, { fontSize: 9 }]}>Set {s.num}</Text>
              <Text style={styles.chipVal}>{s.weight} kg</Text>
              <Text style={styles.chipSub}>× {s.reps} reps</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputsRow}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.stepperLbl}>Weight (kg)</Text>
          <View style={styles.stepperRow}>
            <Pressable style={styles.stepBtn} onPress={decWeight}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <TextInput style={styles.stepInput} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.neutral500} value={weightInput} onChangeText={setWeightInput} />
            <Pressable style={styles.stepBtn} onPress={incWeight}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.stepperLbl}>Reps</Text>
          <View style={styles.stepperRow}>
            <Pressable style={styles.stepBtn} onPress={decReps}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <TextInput style={styles.stepInput} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.neutral500} value={repsInput} onChangeText={setRepsInput} />
            <Pressable style={styles.stepBtn} onPress={incReps}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={styles.addBtn} onPress={addSet}>
        <TrPlusIcon size={15} color={colors.bg} />
        <Text style={styles.addBtnText}>Add Set</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 4, fontFamily: fonts.regular },
  title: { fontFamily: fonts.medium, fontSize: 19, color: colors.text },
  prevRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
  prevIco: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  stepperLbl: { fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.neutral500, fontFamily: fonts.regular },
  prevVal: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, marginTop: 2 },
  chipRow: { gap: 8 },
  chip: { alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 14, minWidth: 66 },
  chipVal: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  chipSub: { fontSize: 10.5, color: colors.neutral500 },
  inputsRow: { flexDirection: 'row', gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 34, height: 38, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 17, color: colors.text },
  stepInput: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.sm, paddingVertical: 9, paddingHorizontal: 6, fontSize: 14, color: colors.text, backgroundColor: colors.bg, textAlign: 'center', fontFamily: fonts.regular },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  addBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
