import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { useTrackerStore } from '@/store/trackerStore';
import { fmtWeight } from '@/engine/units';
import { DetailScreenHeader } from '@/components/tracker/DetailScreenHeader';

export function StrengthDetailScreen() {
  const { activities, activeActivityIndex, unitSystem } = useTrackerStore();
  const a = activeActivityIndex !== null ? activities[activeActivityIndex] : null;

  if (!a || !a.strengthStats) return <SafeAreaView style={styles.screen} edges={['top']} />;
  const ss = a.strengthStats;
  const totalSets = ss.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailScreenHeader title={a.title} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.time}>{a.time}</Text>
        <View style={styles.statsRow}>
          <Stat label="Time" val={`${ss.duration} min`} />
          <Stat label="Exercises" val={String(ss.exercises.length)} />
          <Stat label="Total Sets" val={String(totalSets)} />
        </View>
        <View style={{ gap: 10 }}>
          {ss.exercises.map((ex) => (
            <View key={ex.name} style={styles.card}>
              <Text style={styles.exName}>{ex.name}</Text>
              <View style={styles.headerRow}>
                <Text style={[styles.colHeader, { width: 24 }]}>Set</Text>
                <Text style={styles.colHeader}>Weight</Text>
                <Text style={styles.colHeader}>Reps</Text>
              </View>
              {ex.sets.map((s, i) => (
                <View key={i} style={styles.setRow}>
                  <Text style={[styles.setNum, { width: 24 }]}>{i + 1}</Text>
                  <Text style={styles.setVal}>{fmtWeight(s.weight, unitSystem, s.weight < 10 ? 1 : 0)}</Text>
                  <Text style={styles.setVal}>{s.reps}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statKicker}>{label}</Text>
      <Text style={styles.statVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30, gap: 16 },
  time: { textAlign: 'center', fontSize: 11.5, color: colors.neutral500, fontFamily: fonts.regular },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stat: { alignItems: 'center' },
  statKicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 5, fontFamily: fonts.regular },
  statVal: { fontFamily: fonts.semiBold, fontSize: 19, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  exName: { fontSize: 13.5, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 10 },
  headerRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  colHeader: { flex: 1, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.neutral500, fontFamily: fonts.regular },
  setRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  setNum: { fontSize: 12.5, color: colors.neutral500, fontFamily: fonts.regular },
  setVal: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.text },
});
