import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { AddSetSheet } from '@/components/tracker/AddSetSheet';
import { TrChevLeftIcon, TrPlusIcon } from '@/icons';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { buildExerciseHistory, buildExerciseGraph, build1RMGraph, HistorySession } from '@/engine/exerciseHistory';
import { fmtWeightAuto, weightUnitLabel, weightValueAuto, UnitSystem } from '@/engine/units';
import { useTrackerStore } from '@/store/trackerStore';

const TABS: ['sets' | 'analyze' | '1rm', string][] = [
  ['sets', 'Sets'],
  ['analyze', 'Analyze'],
  ['1rm', '1RM History'],
];

export function ExerciseDetail() {
  const navigation = useNavigation();
  const { activeExerciseId, findExerciseById, exerciseDetailTab, selectExerciseTab, openExercise, unitSystem, workoutLogs } = useTrackerStore();

  // activeExerciseId doubles as the "Log set" sheet's open flag and is cleared
  // when that sheet closes — so remember the exercise this screen was opened
  // for instead of falling back to a fixed one (which crashed once that
  // exercise had been edited/removed, and showed the wrong lift otherwise).
  const shownId = useRef<string | null>(activeExerciseId);
  if (activeExerciseId) shownId.current = activeExerciseId;
  const ex = shownId.current ? findExerciseById(shownId.current) : null;

  const history = useMemo(() => (ex ? buildExerciseHistory(ex.name, workoutLogs) : []), [ex?.name, workoutLogs]);
  const historyDesc = useMemo(() => [...history].reverse(), [history]); // most-recent-first for the Sets list

  // The exercise was deleted or swapped out while this screen was open.
  if (!ex) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
            <TrChevLeftIcon size={16} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[styles.h1, { padding: 20 }]}>This exercise is no longer in your workout.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <View style={{ width: 34 }} />
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

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Log your first sets for {ex.name} with the + button and your history, progress graph and estimated 1RM will build up here.</Text>
          </View>
        ) : (
          <>
            {exerciseDetailTab === 'sets' && (
              <View style={{ gap: 12 }}>
                {historyDesc.map((day, di) => (
                  <HistCard key={di} day={day} unitSystem={unitSystem} />
                ))}
              </View>
            )}

            {exerciseDetailTab === 'analyze' &&
              (history.length < 2 ? <NeedMoreData /> : <AnalyzeGraph history={history} unitSystem={unitSystem} />)}

            {exerciseDetailTab === '1rm' &&
              (history.length < 2 ? <NeedMoreData /> : <OneRMHistory history={history} unitSystem={unitSystem} />)}
          </>
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

      <AddSetSheet />
    </SafeAreaView>
  );
}

function HistCard({ day, unitSystem }: { day: HistorySession; unitSystem: UnitSystem }) {
  return (
    <View style={styles.histCard}>
      <View style={styles.histHead}>
        <Text style={styles.histHeadText}>{day.date}</Text>
      </View>
      {day.sets.map((st, i) => (
        <View key={i} style={[styles.histSet, i > 0 && styles.histSetBorder]}>
          <Text style={styles.histNum}>{st.num}</Text>
          <Text style={styles.histTime}>{st.time}</Text>
          <Text style={styles.histReps}>
            {st.reps} <Text style={styles.histUnit}>rep</Text>
          </Text>
          <Text style={styles.histWeight}>{fmtWeightAuto(st.weight, unitSystem)}</Text>
        </View>
      ))}
    </View>
  );
}

function NeedMoreData() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>Not enough data yet</Text>
      <Text style={styles.emptyText}>Log this exercise in at least two workouts to see how it's trending.</Text>
    </View>
  );
}

function graphLabel(date: string): string {
  return date;
}

function AnalyzeGraph({ history, unitSystem }: { history: HistorySession[]; unitSystem: UnitSystem }) {
  const graph = buildExerciseGraph(history);
  return (
    <View style={styles.graphCard}>
      <View style={styles.graphTop}>
        <View>
          <Text style={styles.graphVal}>
            {weightValueAuto(graph.lastWeight, unitSystem)} <Text style={styles.graphValUnit}>{weightUnitLabel(unitSystem)} top set</Text>
          </Text>
          <Text style={styles.graphSub}>Over your last {history.length} sessions</Text>
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
            {graphLabel(sess.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Estimated (not tested) via the Epley formula from each session's heaviest set.
function OneRMHistory({ history, unitSystem }: { history: HistorySession[]; unitSystem: UnitSystem }) {
  const graph = build1RMGraph(history);
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.graphCard}>
        <View style={styles.graphTop}>
          <View>
            <Text style={styles.graphVal}>
              {weightValueAuto(graph.lastWeight, unitSystem)} <Text style={styles.graphValUnit}>{weightUnitLabel(unitSystem)} est. 1RM</Text>
            </Text>
            <Text style={styles.graphSub}>Estimated from your top set each session</Text>
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
              {graphLabel(sess.date)}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.bestRow}>
        <Text style={styles.bestLabel}>Best (est.)</Text>
        <Text style={styles.bestVal}>{fmtWeightAuto(graph.best, unitSystem)}</Text>
      </View>
      <Text style={styles.disclaimer}>
        Estimated using the Epley formula from your heaviest set each session — not a tested max, so treat it as a guide rather than an exact number.
      </Text>
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
  bestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 18 },
  bestLabel: { fontSize: 13, color: colors.text, fontFamily: fonts.medium },
  bestVal: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.strength },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, gap: 6 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.neutral500, fontFamily: fonts.regular },
  disclaimer: { fontSize: 11, color: colors.neutral500, lineHeight: 16, paddingHorizontal: 2, fontFamily: fonts.regular },
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
