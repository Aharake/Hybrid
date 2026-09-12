import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrPlusIcon, TrTrashIcon } from '@/icons';
import { useTrackerStore, EXERCISE_POOL, MuscleGroupKey } from '@/store/trackerStore';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

interface DraftExercise {
  name: string;
  group: MuscleGroupKey | 'Custom';
}

// Reached from NewSessionSheet's "Custom Workout" option — name the workout,
// build its exercise list, then create it as a new session and jump
// straight into Session Overview to start it.
export function CustomWorkoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const createCustomSession = useTrackerStore((s) => s.createCustomSession);
  const setActiveSessionKey = useTrackerStore((s) => s.setActiveSessionKey);

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [search, setSearch] = useState('');

  const already = new Set(exercises.map((e) => e.name.toLowerCase()));
  const rawQuery = search.trim();
  const query = rawQuery.toLowerCase();

  const groups = (Object.keys(EXERCISE_POOL) as MuscleGroupKey[])
    .map((group) => ({
      group,
      filtered: EXERCISE_POOL[group].filter((n) => !already.has(n.toLowerCase()) && (!query || n.toLowerCase().includes(query))),
    }))
    .filter((g) => g.filtered.length > 0);

  const allPoolNamesLower = Object.values(EXERCISE_POOL).flat().map((n) => n.toLowerCase());
  const showCustomAdd = !!query && !allPoolNamesLower.includes(query) && !already.has(query);

  const addExercise = (exName: string, group: MuscleGroupKey | 'Custom') => {
    setExercises((prev) => [...prev, { name: exName, group }]);
    setSearch('');
  };
  const removeExercise = (exName: string) => {
    setExercises((prev) => prev.filter((e) => e.name !== exName));
  };

  const canCreate = name.trim().length > 0 && exercises.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const key = createCustomSession(name, exercises);
    setActiveSessionKey(key);
    navigation.replace('SessionOverview');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>New Custom Workout</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text style={typography.kicker}>Workout Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Arm Day"
            placeholderTextColor={colors.neutral500}
            value={name}
            onChangeText={setName}
          />
        </View>

        {exercises.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={typography.kicker}>Exercises ({exercises.length})</Text>
            <View style={{ gap: 8 }}>
              {exercises.map((ex) => (
                <View key={ex.name} style={styles.exRow}>
                  <Text style={styles.exRowText}>{ex.name}</Text>
                  <Pressable hitSlop={8} onPress={() => removeExercise(ex.name)}>
                    <TrTrashIcon size={15} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text style={typography.kicker}>Add Exercise</Text>
          <TextInput
            style={styles.search}
            placeholder="Search exercises..."
            placeholderTextColor={colors.neutral500}
            value={search}
            onChangeText={setSearch}
          />
          {showCustomAdd && (
            <Pressable style={styles.customRow} onPress={() => addExercise(rawQuery, 'Custom')}>
              <Text style={styles.customRowText}>Add "{rawQuery}"</Text>
              <TrPlusIcon size={15} color={colors.strength} />
            </Pressable>
          )}
          {groups.map(({ group, filtered }) => (
            <View key={group} style={{ gap: 8 }}>
              <Text style={styles.groupLabel}>{group}</Text>
              <View style={{ gap: 8 }}>
                {filtered.map((exName) => (
                  <Pressable key={exName} style={styles.option} onPress={() => addExercise(exName, group)}>
                    <Text style={styles.optionText}>{exName}</Text>
                    <TrPlusIcon size={15} color={colors.text} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.createBtn, !canCreate && styles.createBtnDisabled]} onPress={handleCreate} disabled={!canCreate}>
          <Text style={styles.createBtnText}>Create Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, gap: 22 },
  nameInput: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: colors.text, fontFamily: fonts.medium },
  exRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16 },
  exRowText: { fontSize: 14, color: colors.text, fontFamily: fonts.medium },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(226,135,47,0.12)', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  customRowText: { fontSize: 14.5, color: colors.strength, fontFamily: fonts.medium },
  groupLabel: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, fontFamily: fonts.regular },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionText: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
  footer: { paddingHorizontal: 20, paddingBottom: 14 },
  createBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  createBtnDisabled: { backgroundColor: colors.neutral800 },
  createBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
