import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutTimerBlock } from '@/components/tracker/WorkoutTimerBlock';
import { SwapExerciseSheet } from '@/components/tracker/SwapExerciseSheet';
import { AddExerciseSheet } from '@/components/tracker/AddExerciseSheet';
import { TrChartIcon, TrCheckIcon, TrChevLeftIcon, TrChevRightIcon, TrClockIcon, TrPlayIcon, TrStrengthIcon, TrSwapIcon, TrTrashIcon } from '@/icons';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { getTodayFull } from '@/engine/calendar';
import { useTrackerStore, SessionExercise } from '@/store/trackerStore';
import { fmtWeightAuto, weightToKg, weightUnitLabel, weightValueAuto } from '@/engine/units';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

export function SessionOverview() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const {
    activeSessionKey,
    sessions,
    workout,
    sets,
    expandedExercises,
    editingExercises,
    startWorkout,
    cancelWorkout,
    finishWorkout,
    toggleEditExercises,
    toggleExpandExercise,
    updateSet,
    removeSet,
    toggleSetDone,
    workoutLogs,
    addSetTo,
    deleteExercise,
    openSwapExercise,
    openAddExercise,
    viewExerciseAnalytics,
    unitSystem,
  } = useTrackerStore();

  const [finishing, setFinishing] = useState(false);

  // What each exercise's sets were last time, set by set, for the Previous column.
  const previousSets = useMemo(() => {
    const latest: Record<string, { date: number; sets: { weight: number; reps: number }[] }> = {};
    workoutLogs.forEach((log) => {
      const byName: Record<string, { weight: number; reps: number }[]> = {};
      log.sets.forEach((st) => {
        const k = st.exerciseName.toLowerCase();
        byName[k] = [...(byName[k] ?? []), { weight: st.weight, reps: st.reps }];
      });
      Object.entries(byName).forEach(([k, list]) => {
        if (!latest[k] || log.date > latest[k].date) latest[k] = { date: log.date, sets: list };
      });
    });
    return latest;
  }, [workoutLogs]);
  const sess = sessions[activeSessionKey];

  // The session was removed (e.g. the program was edited) while this screen was open.
  if (!sess) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
            <TrChevLeftIcon size={16} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[styles.h1, { padding: 20, fontSize: 22, lineHeight: 28 }]}>This workout is no longer in your program.</Text>
      </SafeAreaView>
    );
  }

  const isToday = sess.day === getTodayFull();
  const titleText = isToday ? "Today's Workout" : sess.day === 'Unscheduled' ? 'Workout' : `${sess.day}'s Workout`;

  const viewExercise = (ex: SessionExercise) => {
    viewExerciseAnalytics(ex.id);
    navigation.navigate('ExerciseDetail');
  };

  const handleCancel = () => {
    Alert.alert('Discard this workout?', "Sets you've logged in this session won't be saved.", [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: cancelWorkout },
    ]);
  };

  const runFinish = async (includeUnchecked: boolean) => {
    setFinishing(true);
    const result = await finishWorkout({ includeUnchecked });
    setFinishing(false);
    if (!result.ok) {
      Alert.alert(
        "Couldn't save this workout",
        (result.error ?? 'Check your connection and try again.') +
          " Your workout is saved on this device and will upload automatically the next time you're online.",
      );
    }
  };

  // Only checked-off sets are saved, so make sure that's what was meant.
  const handleFinish = () => {
    const rows = sess.exercises.flatMap((ex) => sets[ex.id] || []);
    const checked = rows.filter((r) => r.done && r.reps > 0).length;
    const unchecked = rows.filter((r) => !r.done && r.reps > 0).length;
    if (unchecked > 0) {
      Alert.alert(
        unchecked === 1 ? "1 set isn't checked off" : `${unchecked} sets aren't checked off`,
        'Only checked sets are saved to your workout.',
        [
          { text: 'Keep going', style: 'cancel' },
          ...(checked > 0 ? [{ text: 'Skip them', onPress: () => runFinish(false) }] : []),
          { text: 'Save them too', onPress: () => runFinish(true) },
        ],
      );
      return;
    }
    if (checked === 0) {
      Alert.alert('No sets to save', 'Fill in reps and weight, then tap the check on each set you finish.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard workout', style: 'destructive', onPress: cancelWorkout },
      ]);
      return;
    }
    runFinish(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        {workout.active ? (
          <>
            <Pressable onPress={handleCancel} disabled={finishing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.finishBtn} onPress={handleFinish} disabled={finishing}>
              {finishing ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <Text style={styles.finishBtnText}>Finish</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
            <TrChevLeftIcon size={16} color={colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.kicker}>{titleText}</Text>
        <Text style={styles.h1}>{activeSessionKey}</Text>
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <TrClockIcon size={12} color={colors.neutral500} />
            <Text style={styles.pillText}>{sess.duration} min</Text>
          </View>
          <View style={styles.pill}>
            <TrStrengthIcon size={12} color={colors.neutral500} />
            <Text style={styles.pillText}>{sess.exercises.length} exercises</Text>
          </View>
          {sess.muscleGroups.map((m) => (
            <View key={m.name} style={[styles.pill, styles.pillAccent]}>
              <Text style={[styles.pillText, styles.pillAccentText]}>{m.name}</Text>
            </View>
          ))}
        </View>

        {workout.active && <WorkoutTimerBlock />}

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <Text style={styles.link} onPress={toggleEditExercises}>
            {editingExercises ? 'Done' : 'Edit'}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {sess.exercises.map((ex) => {
            const isExpanded = expandedExercises.includes(ex.id);
            const rows = sets[ex.id] || [];
            return (
              <Animated.View key={ex.id} style={styles.exWrap} layout={LinearTransition.duration(220)}>
                <Pressable style={styles.exPill} onPress={() => toggleExpandExercise(ex.id)}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <View style={styles.exRight}>
                    <Text style={styles.exSets}>{ex.sets} sets</Text>
                    {editingExercises && (
                      <Pressable
                        hitSlop={6}
                        style={styles.exDel}
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteExercise(activeSessionKey, ex.id);
                        }}
                      >
                        <TrTrashIcon size={15} color="#ef4444" />
                      </Pressable>
                    )}
                    <Pressable
                      hitSlop={6}
                      style={styles.exIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        viewExercise(ex);
                      }}
                    >
                      <TrChartIcon size={17} color={colors.text} />
                    </Pressable>
                    <Pressable
                      hitSlop={6}
                      style={styles.exIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        openSwapExercise(activeSessionKey, ex.id);
                      }}
                    >
                      <TrSwapIcon size={15} color={colors.text} />
                    </Pressable>
                    <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                      <TrChevRightIcon size={14} color={colors.text} />
                    </View>
                  </View>
                </Pressable>
                {isExpanded && (
                  <Animated.View
                    style={styles.exExpand}
                    entering={FadeIn.duration(180)}
                    exiting={FadeOut.duration(140)}
                    layout={LinearTransition.duration(220)}
                  >
                    {rows.length ? (
                      <>
                        <View style={styles.setHead}>
                          <Text style={[styles.setHeadText, { width: 16 }]}>SET</Text>
                          <Text style={[styles.setHeadText, { width: 62 }]}>PREVIOUS</Text>
                          <Text style={[styles.setHeadText, { flex: 1 }]}>REPS</Text>
                          <Text style={[styles.setHeadText, { flex: 1 }]}>WEIGHT</Text>
                          <View style={{ width: 28 }} />
                        </View>
                        {rows.map((row, i) => {
                          const prev = previousSets[ex.name.toLowerCase()]?.sets[i];
                          return (
                            <View key={i} style={[styles.setRow, row.done && styles.setRowDone]}>
                              <Text style={styles.setNum}>{i + 1}</Text>
                              <Text style={styles.setPrev} numberOfLines={1}>
                                {prev ? `${weightValueAuto(prev.weight, unitSystem)}×${prev.reps}` : ex.previous ? fmtWeightAuto(ex.previous, unitSystem) : '—'}
                              </Text>
                              <View style={styles.setField}>
                                <NumField
                                  style={styles.setFieldInput}
                                  editable={!row.done}
                                  value={row.reps}
                                  toText={(n) => String(n)}
                                  onChange={(n) => updateSet(ex.id, i, 'reps', Math.round(n))}
                                />
                                <Text style={styles.unit}>rep</Text>
                              </View>
                              <View style={styles.setField}>
                                <NumField
                                  style={styles.setFieldInput}
                                  editable={!row.done}
                                  value={row.weight}
                                  toText={(kg) => weightValueAuto(kg, unitSystem)}
                                  onChange={(n) => updateSet(ex.id, i, 'weight', weightToKg(n, unitSystem))}
                                />
                                <Text style={styles.unit}>{weightUnitLabel(unitSystem)}</Text>
                              </View>
                              {editingExercises ? (
                                <Pressable style={styles.setCheck} onPress={() => removeSet(ex.id, i)} hitSlop={6}>
                                  <TrTrashIcon size={12} color="#ef4444" />
                                </Pressable>
                              ) : (
                                <Pressable style={[styles.setCheck, row.done && styles.setCheckDone]} onPress={() => toggleSetDone(ex.id, i)} hitSlop={6}>
                                  <TrCheckIcon size={13} color={row.done ? colors.bg : colors.neutral500} />
                                </Pressable>
                              )}
                            </View>
                          );
                        })}
                      </>
                    ) : (
                      <Text style={styles.noSets}>No sets logged yet.</Text>
                    )}
                    <Pressable style={styles.expAddBtn} onPress={() => addSetTo(ex.id)}>
                      <Text style={styles.expAddBtnText}>+ Add Set</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
          {editingExercises && (
            <Pressable style={styles.addExBtn} onPress={() => openAddExercise(activeSessionKey)}>
              <Text style={styles.addExBtnText}>+ Add Exercise</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {!workout.active && (
        <View style={styles.footer}>
          <Pressable style={styles.startBtn} onPress={startWorkout}>
            <TrPlayIcon size={16} color={colors.bg} />
            <Text style={styles.startBtnText}>Start workout</Text>
          </Pressable>
        </View>
      )}

      <SwapExerciseSheet />
      <AddExerciseSheet />
    </SafeAreaView>
  );
}

// A number box that keeps the text being typed as-is while focused (so "82.",
// or clearing the box to retype, isn't snapped back to "0"), and only
// reformats from the stored value once the user leaves it.
function NumField({ value, toText, onChange, style, editable = true }: { value: number; toText: (n: number) => string; onChange: (n: number) => void; style: object; editable?: boolean }) {
  const [text, setText] = useState(toText(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <TextInput
      style={style}
      keyboardType="decimal-pad"
      editable={editable}
      value={text}
      selectTextOnFocus
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(toText(value));
      }}
      onChangeText={(v) => {
        setText(v);
        const n = parseFloat(v.replace(',', '.'));
        onChange(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  cancelText: { fontSize: 14.5, color: colors.neutral500, fontFamily: fonts.regular },
  finishBtn: { backgroundColor: colors.text, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  finishBtnText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.bg },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 16 },
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 2, fontFamily: fonts.regular },
  h1: { fontFamily: fonts.bold, fontSize: 34, letterSpacing: -0.4, color: colors.text, lineHeight: 36 },
  pillsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  pillText: { fontSize: 11.5, fontFamily: fonts.semiBold, color: colors.text },
  pillAccent: { backgroundColor: 'rgba(226,135,47,0.12)' },
  pillAccentText: { color: colors.strength },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  exWrap: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  exPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
  exName: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flexShrink: 1 },
  exRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exSets: { fontSize: 13, color: colors.neutral500, fontFamily: fonts.regular },
  exDel: { padding: 6 },
  exIconBtn: { padding: 4 },
  exExpand: { paddingHorizontal: 10, paddingBottom: 16, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  setHeadText: { fontSize: 9.5, letterSpacing: 0.6, color: colors.neutral500, fontFamily: fonts.semiBold },
  setRowDone: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 12, marginHorizontal: -6, paddingHorizontal: 6, paddingVertical: 4 },
  setNum: { width: 16, fontSize: 13, color: colors.text, fontFamily: fonts.semiBold },
  setPrev: { width: 62, fontSize: 11.5, color: colors.neutral500, fontFamily: fonts.regular },
  setField: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 10 },
  setFieldInput: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14.5, padding: 0, color: colors.text },
  unit: { fontSize: 11, color: colors.neutral500, marginLeft: 6 },
  setCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral400, alignItems: 'center', justifyContent: 'center' },
  setCheckDone: { backgroundColor: colors.green, borderColor: colors.green },
  noSets: { fontSize: 12.5, color: colors.neutral500, paddingVertical: 4, fontFamily: fonts.regular },
  expAddBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 9, marginTop: 2, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.neutral300, borderStyle: 'dashed' },
  expAddBtnText: { fontSize: 12.5, color: colors.neutral500, fontFamily: fonts.semiBold },
  addExBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.neutral400, borderStyle: 'dashed' },
  addExBtnText: { fontSize: 13.5, color: colors.neutral500, fontFamily: fonts.semiBold },
  footer: { paddingHorizontal: 20, paddingBottom: 14 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  startBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
