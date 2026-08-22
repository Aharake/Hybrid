import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { NewSessionSheet } from '@/components/tracker/NewSessionSheet';
import { AddSetSheet } from '@/components/tracker/AddSetSheet';
import { RunTrackerOverlay } from '@/components/tracker/RunTrackerOverlay';
import { RunSetupSheet } from '@/components/tracker/RunSetupSheet';
import { TrChevDownIcon, TrChevLeftIcon, TrChevRightIcon, TrHistoryIcon, TrMoreIcon, TrPlusIcon } from '@/icons';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { generateExerciseHistory, buildExerciseGraph, HistorySession } from '@/engine/exerciseHistory';
import { useTrackerStore } from '@/store/trackerStore';

const TABS: ['sets' | 'analyze' | '1rm', string][] = [
  ['sets', 'Sets'],
  ['analyze', 'Analyze'],
  ['1rm', '1RM History'],
];

export function ExerciseDetail() {
  const navigation = useNavigation();
  const { activeExerciseId, findExerciseById, exerciseDetailTab, selectExerciseTab, openExercise } = useTrackerStore();

  const ex = findExerciseById(activeExerciseId || '') || findExerciseById('ex1')!;
  const history = useMemo(() => generateExerciseHistory(ex.id, ex.previous), [ex.id, ex.previous]);
  const historyDesc = useMemo(() => [...history].reverse(), [history]); // most-recent-first for the Sets list

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Pressable style={styles.iconBtnRound}>
          <TrMoreIcon size={16} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.kicker}>{ex.group || 'Exercise'}</Text>
          <Text style={styles.h1}>{ex.name}</Text>
        </View>

        <View style={styles.segPill}>
          {TABS.map(([id, label]) => {
            const active = exerciseDetailTab === id;
            return (
              <Pressable key={id} style={[styles.segItem, active && styles.segItemActive]} onPress={() => selectExerciseTab(id)}>
                <Text style={[styles.segItemText, active && styles.segItemTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {exerciseDetailTab === 'sets' && (
          <View style={{ gap: 12 }}>
            {historyDesc.map((day, di) => (
              <HistCard key={di} day={day} />
            ))}
          </View>
        )}

        {exerciseDetailTab === 'analyze' && <AnalyzeGraph history={history} />}

        {exerciseDetailTab === '1rm' && (
          <View style={styles.emptyState}>
            <TrHistoryIcon size={28} color={colors.neutral500} />
            <Text style={styles.emptyText}>Your one-rep-max history appears here.</Text>
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fabLog} onPress={() => openExercise(ex.id)}>
        <TrPlusIcon size={16} color={colors.bg} />
      </Pressable>
      <View style={styles.footer}>
        <Pressable style={styles.primaryPill} onPress={() => openExercise(ex.id)}>
          <Text style={styles.primaryPillText}>Log Today's Workout</Text>
        </Pressable>
      </View>
      <TrackerTabBar active="StrengthTab" />

      <NewSessionSheet />
      <AddSetSheet />
      <RunTrackerOverlay />
      <RunSetupSheet />
    </SafeAreaView>
  );
}

function HistCard({ day }: { day: HistorySession }) {
  return (
    <View style={styles.histCard}>
      <View style={styles.histHead}>
        <Text style={styles.histHeadText}>{day.date}</Text>
        <TrChevDownIcon size={14} color={colors.text} />
      </View>
      {day.sets.map((st, i) => (
        <View key={i} style={[styles.histSet, i > 0 && styles.histSetBorder]}>
          <Text style={styles.histNum}>{st.num}</Text>
          <Text style={styles.histTime}>{st.time}</Text>
          <Text style={styles.histReps}>
            {st.reps} <Text style={styles.histUnit}>rep</Text>
          </Text>
          <Text style={styles.histWeight}>{st.weight}</Text>
          <TrChevRightIcon size={14} color={colors.text} />
        </View>
      ))}
    </View>
  );
}

function AnalyzeGraph({ history }: { history: HistorySession[] }) {
  const graph = buildExerciseGraph(history);
  return (
    <View style={styles.graphCard}>
      <View style={styles.graphTop}>
        <View>
          <Text style={styles.graphVal}>
            {graph.lastWeight} <Text style={styles.graphValUnit}>kg top set</Text>
          </Text>
          <Text style={styles.graphSub}>Over the last 6 sessions</Text>
        </View>
        <Text style={[styles.graphChange, { color: graph.trendUp ? colors.strength : colors.running }]}>
          {graph.trendUp ? '↑' : '↓'} {graph.trendUp ? '+' : ''}
          {graph.pctChange}%
        </Text>
      </View>
      <Svg width="100%" height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`}>
        <Path d={graph.pathD} fill="none" stroke={colors.strength} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {graph.points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.bg} stroke={colors.strength} strokeWidth={2.5} />
        ))}
      </Svg>
      <View style={styles.graphLabels}>
        {history.map((sess, i) => (
          <Text key={i} style={styles.graphLabel}>
            {sess.date === 'This week' ? 'Now' : sess.date === 'Last week' ? '1w' : sess.date.replace(' weeks ago', 'w')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 130, gap: 16 },
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, fontFamily: fonts.regular },
  h1: { fontFamily: fonts.medium, fontSize: 25, color: colors.text, letterSpacing: -0.2, marginTop: 2 },
  segPill: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segItemActive: { backgroundColor: colors.bg },
  segItemText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.neutral500 },
  segItemTextActive: { color: colors.text },
  histCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  histHeadText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  histSet: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  histSetBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  histNum: { width: 16, fontSize: 12, color: colors.neutral400 },
  histTime: { flex: 1, fontSize: 13, color: colors.neutral500 },
  histReps: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  histUnit: { fontSize: 11, color: colors.neutral500, fontFamily: fonts.regular },
  histWeight: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, minWidth: 64, textAlign: 'right' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { color: colors.neutral500, fontSize: 13, textAlign: 'center', fontFamily: fonts.regular },
  graphCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 },
  graphTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  graphVal: { fontFamily: fonts.semiBold, fontSize: 24, color: colors.text },
  graphValUnit: { fontSize: 13, fontFamily: fonts.medium, color: colors.neutral500 },
  graphSub: { fontSize: 11.5, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  graphChange: { fontFamily: fonts.semiBold, fontSize: 14 },
  graphLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  graphLabel: { flex: 1, fontSize: 9.5, color: colors.neutral500, textAlign: 'center' },
  fabLog: { position: 'absolute', right: 20, bottom: 148, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  footer: { paddingHorizontal: 20, paddingBottom: 14 },
  primaryPill: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  primaryPillText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
});
