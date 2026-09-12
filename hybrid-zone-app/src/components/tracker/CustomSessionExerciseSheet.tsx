import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrPlusIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore, EXERCISE_POOL, MuscleGroupKey } from '@/store/trackerStore';

// Program Editor's "Add Exercise" picker for a custom session — same
// search/pool/custom-name pattern as AddExerciseSheet, but writes into
// programEdit.customSessions instead of a live session.
export function CustomSessionExerciseSheet() {
  const { customSessionExercisePicker, addExerciseSearch, closeCustomSessionExercisePicker, setAddExerciseSearch, programEdit, addExerciseToCustomSession } =
    useTrackerStore();
  if (!customSessionExercisePicker || !programEdit) return null;
  const already = new Set((programEdit.customSessions[customSessionExercisePicker]?.exercises || []).map((e) => e.name.toLowerCase()));
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

  return (
    <Sheet visible onClose={closeCustomSessionExercisePicker} title="Add Exercise" tall zIndex={50}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises..."
        placeholderTextColor={colors.neutral500}
        value={addExerciseSearch}
        onChangeText={setAddExerciseSearch}
      />
      {showCustomAdd && (
        <Pressable style={styles.customRow} onPress={() => addExerciseToCustomSession(rawQuery, 'Custom')}>
          <Text style={styles.customRowText}>Add "{rawQuery}"</Text>
          <TrPlusIcon size={15} color={colors.strength} />
        </Pressable>
      )}
      {groups.map(({ group, filtered }) => (
        <View key={group} style={{ gap: 8 }}>
          <Text style={typography.kicker}>{group}</Text>
          <View style={{ gap: 8 }}>
            {filtered.map((name) => (
              <Pressable key={name} style={styles.option} onPress={() => addExerciseToCustomSession(name, group)}>
                <Text style={styles.optionText}>{name}</Text>
                <TrPlusIcon size={15} color={colors.text} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(226,135,47,0.12)', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  customRowText: { fontSize: 14.5, color: colors.strength, fontFamily: fonts.medium },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionText: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
});
