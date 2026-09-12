import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { useTrackerStore, LOGGABLE_ACTIVITY_TYPES, ACTIVITY_ICONS } from '@/store/trackerStore';
import { distanceUnitLabel } from '@/engine/units';
import { DetailScreenHeader } from '@/components/tracker/DetailScreenHeader';
import { MetricIcon } from '@/components/tracker/iconMap';

export function LogActivityFormScreen() {
  const navigation = useNavigation();
  const {
    logActivityType,
    logActivityTitle,
    logActivityDuration,
    logActivityDistance,
    selectLogActivityType,
    setLogActivityTitle,
    setLogActivityDuration,
    setLogActivityDistance,
    saveLoggedActivity,
    unitSystem,
  } = useTrackerStore();

  const typeInfo = LOGGABLE_ACTIVITY_TYPES.find((t) => t.id === logActivityType)!;
  const canSave = parseFloat(logActivityDuration) > 0;

  const handleSave = () => {
    if (!canSave) return;
    saveLoggedActivity();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailScreenHeader title="Log Activity" variant="x" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.sectionTitle}>Type</Text>
          <View style={styles.typeRow}>
            {LOGGABLE_ACTIVITY_TYPES.map((t) => {
              const active = logActivityType === t.id;
              return (
                <Pressable key={t.id} style={[styles.typeBtn, active && styles.typeBtnActive]} onPress={() => selectLogActivityType(t.id)}>
                  <MetricIcon id={ACTIVITY_ICONS[t.id]} size={18} color={active ? colors.bg : colors.text} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.kicker}>Title</Text>
          <TextInput style={styles.input} placeholder={typeInfo.defaultTitle} placeholderTextColor={colors.neutral500} value={logActivityTitle} onChangeText={setLogActivityTitle} />
        </View>

        <View>
          <Text style={styles.kicker}>Duration (min)</Text>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.neutral500} keyboardType="numeric" value={logActivityDuration} onChangeText={setLogActivityDuration} />
        </View>

        {typeInfo.hasDistance && (
          <View>
            <Text style={styles.kicker}>Distance ({distanceUnitLabel(unitSystem)}) — optional</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.neutral500} keyboardType="numeric" value={logActivityDistance} onChangeText={setLogActivityDistance} />
          </View>
        )}

        <Pressable style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Activity</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 20 },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  typeBtnActive: { backgroundColor: colors.text },
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.neutral500, marginBottom: 6, fontFamily: fonts.regular },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
