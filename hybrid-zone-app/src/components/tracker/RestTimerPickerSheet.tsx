import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrCheckIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore } from '@/store/trackerStore';

const OPTIONS: [number, string][] = [
  [60, '60 seconds'],
  [90, '90 seconds'],
  [120, '2 minutes'],
  [180, '3 minutes'],
];

export function RestTimerPickerSheet() {
  const { restTimerPickerOpen, closeRestTimerPicker, restTimer, selectDefaultRestDuration } = useTrackerStore();

  return (
    <Sheet visible={restTimerPickerOpen} onClose={closeRestTimerPicker} title="Rest Timer Default">
      <View style={{ gap: 8 }}>
        {OPTIONS.map(([sec, label]) => {
          const active = restTimer.duration === sec;
          return (
            <Pressable key={sec} style={[styles.option, active && styles.optionActive]} onPress={() => selectDefaultRestDuration(sec)}>
              <Text style={styles.lbl}>{label}</Text>
              {active && <TrCheckIcon size={15} color={colors.strength} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionActive: { backgroundColor: 'rgba(226,135,47,0.12)' },
  lbl: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
});
