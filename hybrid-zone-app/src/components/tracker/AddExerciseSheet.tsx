import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrPlusIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore, EXERCISE_POOL, MuscleGroupKey } from '@/store/trackerStore';

// Matches Tracker (new).html's addExerciseSheet() (session overview's edit-mode
// "Add Exercise" button). The source's DOM-refocus hack after each keystroke isn't
// needed here — a controlled TextInput doesn't lose focus on re-render.
export function AddExerciseSheet() {
  const { addExerciseFor, addExerciseSearch, closeAddExercise, setAddExerciseSearch, sessions, addExerciseToSession } = useTrackerStore();
  if (!addExerciseFor) return null;

  const already = new Set(sessions[addExerciseFor].exercises.map((e) => e.name.toLowerCase()));
  const rawQuery = (addExerciseSearch || '').trim();
  const query = rawQuery.toLowerCase();

  const groups = (Object.keys(EXERCISE_POOL) as MuscleGroupKey[])
    .map((group) => ({
      group,
      filtered: EXERCISE_POOL[group].filter((n) => !already.has(n.toLowerCase()) && (!query || n.toLowerCase().includes(query))),
    }))
    .filter((g) => g.filtered.length > 0);

  const allPoolNamesLower = Object.values(EXERCISE_POOL).flat().map((n) => n.toLowerCase());
  const showCustomAdd = !!query && !allPoolNamesLower.includes(query) && !already.has(query);
  const anyResults = groups.length > 0;

  return (
    <Sheet visible onClose={closeAddExercise} title="Add Exercise" tall>
      <TextInput
        style={styles.search}
        placeholder="Search exercises..."
        placeholderTextColor={colors.neutral500}
        value={addExerciseSearch}
        onChangeText={setAddExerciseSearch}
      />
      {showCustomAdd && (
        <Pressable style={styles.customRow} onPress={() => addExerciseToSession(rawQuery, 'Custom')}>
          <Text style={styles.customRowText}>Add "{rawQuery}"</Text>
          <TrPlusIcon size={15} color={colors.strength} />
        </Pressable>
      )}
      {anyResults
        ? groups.map(({ group, filtered }) => (
            <View key={group} style={{ gap: 8 }}>
              <Text style={typography.kicker}>{group}</Text>
              <View style={{ gap: 8 }}>
                {filtered.map((name) => (
                  <Pressable key={name} style={styles.option} onPress={() => addExerciseToSession(name, group)}>
                    <Text style={styles.optionText}>{name}</Text>
                    <TrPlusIcon size={15} color={colors.text} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        : !showCustomAdd && <Text style={styles.empty}>No matches for "{rawQuery}".</Text>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(226,135,47,0.12)', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  customRowText: { fontSize: 14.5, color: colors.strength, fontFamily: fonts.medium },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionText: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
  empty: { fontSize: 12.5, color: colors.neutral500, textAlign: 'center', paddingVertical: 16, fontFamily: fonts.regular },
});
