import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrOtherIcon, TrPlusIcon, TrRunSmallIcon, TrStrengthIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore, STRENGTH_WORKOUT_OPTIONS } from '@/store/trackerStore';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

// Matches Tracker (new).html's newSessionSheet() — opened from the tab bar's FAB.
export function NewSessionSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { sheetOpen, sheetTab, sessions, closeAddSession, openRunTracker, setActiveSessionKey, openLogActivityForm } = useTrackerStore();
  const strengthActive = sheetTab === 'strength';

  const selectPreset = (workoutName: string) => {
    // 'Push Day' -> 'Push', matching the keys sessions is keyed by.
    const key = workoutName.replace(/ Day$/, '');
    closeAddSession();
    if (sessions[key]) {
      setActiveSessionKey(key);
      navigation.navigate('SessionOverview');
    }
  };

  return (
    <Sheet visible={sheetOpen} onClose={closeAddSession} title="New Session" tall>
      <View style={styles.toggleRow}>
        <View style={[styles.toggle, strengthActive && styles.toggleActive]}>
          <TrStrengthIcon size={18} color={strengthActive ? colors.bg : colors.neutral500} />
          <Text style={[styles.toggleLabel, strengthActive && styles.toggleLabelActive]}>Strength</Text>
        </View>
        <Pressable
          style={styles.toggle}
          onPress={() => {
            closeAddSession();
            openRunTracker();
          }}
        >
          <TrRunSmallIcon size={18} color={colors.neutral500} />
          <Text style={styles.toggleLabel}>Run</Text>
        </Pressable>
        <Pressable
          style={styles.toggle}
          onPress={() => {
            closeAddSession();
            openLogActivityForm();
            navigation.navigate('LogActivityForm');
          }}
        >
          <TrOtherIcon size={18} color={colors.neutral500} />
          <Text style={styles.toggleLabel}>Log Other</Text>
        </Pressable>
      </View>
      {strengthActive && (
        <View style={{ gap: 8 }}>
          {STRENGTH_WORKOUT_OPTIONS.map((wk) => (
            <Pressable
              key={wk.name}
              style={styles.option}
              onPress={() => {
                if (wk.isCustom) {
                  closeAddSession();
                  navigation.navigate('CustomWorkout');
                } else {
                  selectPreset(wk.name);
                }
              }}
            >
              <View style={styles.optionIco}>{wk.isCustom ? <TrPlusIcon size={16} color={colors.neutral500} /> : <TrStrengthIcon size={16} color={colors.neutral500} />}</View>
              <View>
                <Text style={styles.optionName}>{wk.name}</Text>
                <Text style={styles.optionSub}>{wk.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggle: { flex: 1, alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingVertical: 7, backgroundColor: colors.surface },
  toggleActive: { backgroundColor: colors.text },
  toggleLabel: { fontSize: 11, color: colors.neutral500 },
  toggleLabelActive: { color: colors.bg },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 13, paddingHorizontal: 16 },
  optionIco: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  optionSub: { fontSize: 11.5, color: colors.neutral500, marginTop: 2 },
});
