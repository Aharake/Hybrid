import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrCheckIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore } from '@/store/trackerStore';

const RANGE_OPTIONS: [string, string][] = [
  ['week', 'Week'],
  ['month', 'Month'],
  ['year', 'Year'],
  ['all', 'All'],
];
const TYPE_OPTIONS: [string, string][] = [
  ['all', 'All Activities'],
  ['cycling', 'Cycling'],
  ['swimming', 'Swimming'],
  ['running', 'Running'],
  ['strength', 'Strength'],
  ['walking', 'Walking'],
  ['other', 'Other'],
];

// Matches Tracker (new).html's filterSheet() (used by AllActivities).
export function FilterSheet() {
  const { filterSheetOpen, closeFilterSheet, activityFilter, setActivityFilter } = useTrackerStore();
  const isRange = filterSheetOpen === 'range';
  const options = isRange ? RANGE_OPTIONS : TYPE_OPTIONS;
  const current = filterSheetOpen ? activityFilter[filterSheetOpen] : null;

  return (
    <Sheet visible={!!filterSheetOpen} onClose={closeFilterSheet} title={isRange ? 'Time Range' : 'Activity Type'}>
      <View style={styles.list}>
        {options.map(([val, label]) => {
          const selected = current === val;
          return (
            <Pressable
              key={val}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => filterSheetOpen && setActivityFilter(filterSheetOpen, val)}
            >
              <Text style={styles.lbl}>{label}</Text>
              {selected && <TrCheckIcon size={15} color={colors.strength} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionSelected: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.divider },
  lbl: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
});
