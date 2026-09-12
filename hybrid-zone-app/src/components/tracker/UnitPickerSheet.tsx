import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrCheckIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore } from '@/store/trackerStore';
import type { UnitSystem } from '@/engine/units';

const OPTIONS: { sys: UnitSystem; label: string; sub: string }[] = [
  { sys: 'metric', label: 'Metric', sub: 'Kilometers, kilograms' },
  { sys: 'imperial', label: 'Imperial', sub: 'Miles, pounds' },
];

export function UnitPickerSheet() {
  const { unitPickerOpen, unitSystem, closeUnitPicker, setUnitSystem } = useTrackerStore();

  return (
    <Sheet visible={unitPickerOpen} onClose={closeUnitPicker} title="Units of Measure">
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => {
          const active = unitSystem === o.sys;
          return (
            <Pressable key={o.sys} style={[styles.option, active && styles.optionActive]} onPress={() => setUnitSystem(o.sys)}>
              <View>
                <Text style={styles.lbl}>{o.label}</Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
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
  sub: { fontSize: 11, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
});
