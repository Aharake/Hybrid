import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrCheckIcon, TrTrashIcon, XIcon } from '@/icons';
import { DAY_LABELS, DayLabel } from '@/engine/calendar';
import { useTrackerStore, SPLIT_TEMPLATES } from '@/store/trackerStore';
import { CustomSessionExerciseSheet } from '@/components/tracker/CustomSessionExerciseSheet';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

// Reached from Home's "Edit Program" / Strength's "Edit" links. Replaces the
// whole recurring program at once: pick a preset split (or build custom
// sessions from scratch), assign each session a day, and pick run days.
export function ProgramEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const {
    programEdit,
    selectSplitTemplate,
    setNewSessionNameInput,
    addCustomSession,
    removeCustomSession,
    openCustomSessionExercisePicker,
    removeExerciseFromCustomSession,
    adjustCustomExerciseSets,
    assignSessionDay,
    toggleRunDay,
    saveProgramConfig,
    closeProgramEditor,
  } = useTrackerStore();

  if (!programEdit) return null;
  const isCustom = programEdit.splitKey === 'custom';
  const template = isCustom ? null : SPLIT_TEMPLATES[programEdit.splitKey];
  const sessionNames = isCustom ? Object.keys(programEdit.customSessions) : Object.keys(template!.sessions);
  const allAssignedDays = Object.values(programEdit.dayAssignments);

  const handleClose = () => {
    closeProgramEditor();
    navigation.goBack();
  };
  const handleSave = () => {
    saveProgramConfig();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={handleClose}>
          <XIcon size={14} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Edit Program</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 4 }]}>Choose Your Split</Text>
          <Text style={styles.hint}>The app rebuilds your schedule and sessions to match</Text>
          <View style={{ gap: 8 }}>
            {Object.keys(SPLIT_TEMPLATES).map((key) => {
              const t = SPLIT_TEMPLATES[key];
              const active = programEdit.splitKey === key;
              return (
                <Pressable key={key} style={[styles.splitOption, active && styles.splitOptionActive]} onPress={() => selectSplitTemplate(key)}>
                  <View>
                    <Text style={[styles.splitName, active && styles.splitNameActive]}>{t.name}</Text>
                    <Text style={[styles.splitSub, active && styles.splitSubActive]}>{Object.keys(t.sessions).length} strength days/week</Text>
                  </View>
                  {active && <TrCheckIcon size={14} color={colors.bg} />}
                </Pressable>
              );
            })}
            <Pressable style={[styles.splitOption, isCustom && styles.splitOptionActive]} onPress={() => selectSplitTemplate('custom')}>
              <View>
                <Text style={[styles.splitName, isCustom && styles.splitNameActive]}>Custom</Text>
                <Text style={[styles.splitSub, isCustom && styles.splitSubActive]}>Build your own sessions from scratch</Text>
              </View>
              {isCustom && <TrCheckIcon size={14} color={colors.bg} />}
            </Pressable>
          </View>
        </View>

        {isCustom && (
          <View>
            <Text style={[typography.sectionTitle, { marginBottom: 4 }]}>Build Your Sessions</Text>
            <Text style={styles.hint}>Name each session, then add exercises to it</Text>
            <View style={{ gap: 10 }}>
              {sessionNames.map((name) => {
                const sess = programEdit.customSessions[name];
                return (
                  <View key={name} style={styles.sessCard}>
                    <View style={styles.sessCardHead}>
                      <Text style={styles.sessCardName}>{name}</Text>
                      <Pressable style={styles.smallIconBtn} onPress={() => removeCustomSession(name)}>
                        <XIcon size={12} color={colors.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.sessCardMeta}>
                      {sess.exercises.length} exercise{sess.exercises.length === 1 ? '' : 's'}
                    </Text>
                    {sess.exercises.length > 0 && (
                      <View style={{ gap: 6, marginTop: 10 }}>
                        {sess.exercises.map((ex) => (
                          <View key={ex.id} style={styles.exRow}>
                            <Text style={styles.exRowName}>{ex.name}</Text>
                            <View style={styles.exRowControls}>
                              <Pressable style={styles.miniBtn} onPress={() => adjustCustomExerciseSets(name, ex.id, -1)}>
                                <Text style={styles.miniBtnText}>–</Text>
                              </Pressable>
                              <Text style={styles.exRowSets}>
                                {ex.sets} set{ex.sets === 1 ? '' : 's'}
                              </Text>
                              <Pressable style={styles.miniBtn} onPress={() => adjustCustomExerciseSets(name, ex.id, 1)}>
                                <Text style={styles.miniBtnText}>+</Text>
                              </Pressable>
                            </View>
                            <Pressable hitSlop={8} onPress={() => removeExerciseFromCustomSession(name, ex.id)}>
                              <TrTrashIcon size={13} color={colors.neutral500} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                    <Text style={styles.link} onPress={() => openCustomSessionExercisePicker(name)}>
                      + Add Exercise
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.newSessRow}>
              <TextInput
                style={styles.newSessInput}
                placeholder="Session name, e.g. Leg Day A"
                placeholderTextColor={colors.neutral500}
                value={programEdit.newSessionNameInput}
                onChangeText={setNewSessionNameInput}
              />
              <Pressable style={styles.addSessBtn} onPress={addCustomSession}>
                <Text style={styles.addSessBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        {sessionNames.length > 0 && (
          <View>
            <Text style={[typography.sectionTitle, { marginBottom: 4 }]}>Assign Training Days</Text>
            <Text style={styles.hint}>Tap a day for each session — one strength session per day</Text>
            <View style={{ gap: 14 }}>
              {sessionNames.map((sessName) => {
                const assignedDay = programEdit.dayAssignments[sessName];
                return (
                  <View key={sessName}>
                    <Text style={styles.dayAssignLabel}>{sessName}</Text>
                    <View style={styles.dayChipRow}>
                      {DAY_LABELS.map((d) => {
                        const on = assignedDay === d;
                        const takenByOther = allAssignedDays.includes(d) && !on;
                        return (
                          <Pressable
                            key={d}
                            disabled={takenByOther}
                            style={[styles.dayChip, on && styles.dayChipActive]}
                            onPress={() => assignSessionDay(sessName, d)}
                          >
                            <Text style={[styles.dayChipText, on && styles.dayChipTextActive, takenByOther && styles.dayChipTextDisabled]}>{d[0]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 4 }]}>Run Days</Text>
          <Text style={styles.hint}>Can overlap with a strength day for a mixed session</Text>
          <View style={styles.dayChipRow}>
            {DAY_LABELS.map((d: DayLabel) => {
              const on = programEdit.runDays.includes(d);
              return (
                <Pressable key={d} style={[styles.dayChip, on && styles.dayChipActive]} onPress={() => toggleRunDay(d)}>
                  <Text style={[styles.dayChipText, on && styles.dayChipTextActive]}>{d[0]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable style={[styles.saveBtn, sessionNames.length === 0 && styles.saveBtnDisabled]} disabled={sessionNames.length === 0} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Program</Text>
        </Pressable>
      </ScrollView>

      <CustomSessionExerciseSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 22 },
  hint: { fontSize: 11, color: colors.neutral500, marginBottom: 12, fontFamily: fonts.regular },
  splitOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  splitOptionActive: { backgroundColor: colors.text },
  splitName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  splitNameActive: { color: colors.bg },
  splitSub: { fontSize: 11, color: colors.neutral500, marginTop: 2 },
  splitSubActive: { color: colors.bg, opacity: 0.7 },
  sessCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14 },
  sessCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessCardName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  sessCardMeta: { fontSize: 11, color: colors.neutral500, marginTop: 2 },
  smallIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  exRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  exRowName: { flex: 1, fontSize: 12.5, color: colors.text },
  exRowControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  miniBtnText: { fontSize: 12, color: colors.text },
  exRowSets: { fontSize: 11.5, color: colors.neutral500, minWidth: 38, textAlign: 'center' },
  link: { fontSize: 12.5, color: colors.accent200, marginTop: 10, fontFamily: fonts.regular },
  newSessRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  newSessInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
  addSessBtn: { paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider },
  addSessBtnText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  dayAssignLabel: { fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 7 },
  dayChipRow: { flexDirection: 'row', gap: 5 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface },
  dayChipActive: { backgroundColor: colors.text },
  dayChipText: { fontSize: 11.5, fontFamily: fonts.semiBold, color: colors.text },
  dayChipTextActive: { color: colors.bg },
  dayChipTextDisabled: { color: colors.neutral400 },
  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
