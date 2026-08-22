import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarWeekWidget } from '@/components/tracker/CalendarWeekWidget';
import { MetricTile } from '@/components/tracker/MetricTile';
import { SessionTimelineCard } from '@/components/tracker/SessionTimelineCard';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { NewSessionSheet } from '@/components/tracker/NewSessionSheet';
import { AddSetSheet } from '@/components/tracker/AddSetSheet';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, OVERVIEW_METRICS, SessionKey } from '@/store/trackerStore';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

export function StrengthTab() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { sessions, viewDay, isViewingToday, sets, enabled, setOverviewContext, setActiveSessionKey } = useTrackerStore();

  const sessionKeys = Object.keys(sessions) as SessionKey[];
  const viewDayFull = DAY_FULL_MAP[viewDay];
  const viewSessionKey = sessionKeys.find((key) => sessions[key].day === viewDayFull) || null;
  const viewExercises = viewSessionKey ? sessions[viewSessionKey].exercises : [];
  const doneCount = viewExercises.filter((ex) => (sets[ex.id] || []).length > 0).length;

  const strengthMetrics = OVERVIEW_METRICS.strength.filter((m) => enabled.strength[m.id]);

  const openSession = (key: SessionKey) => {
    setActiveSessionKey(key);
    navigation.navigate('SessionOverview');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CalendarWeekWidget />

        <View>
          <View style={styles.rowBetween}>
            <Text style={typography.sectionTitle}>Overview</Text>
            <Text
              style={styles.link}
              onPress={() => {
                setOverviewContext('strength');
                navigation.navigate('ViewAllOverview');
              }}
            >
              View All
            </Text>
          </View>
          <View style={styles.statRow}>
            {strengthMetrics.map((m) => (
              <MetricTile key={m.id} variant="strength" label={m.label} value={m.id === 'done' ? `${doneCount}/${viewExercises.length}` : m.value} />
            ))}
          </View>
        </View>

        {!viewSessionKey && (
          <View style={styles.restBlock}>
            <Text style={styles.restKicker}>{viewDayFull}</Text>
            <Text style={styles.restTitle}>Rest Day{isViewingToday() ? ' — No Lifting Today' : ''}</Text>
            <Text style={styles.restSub}>
              {isViewingToday() ? "Check Running for today's plan, or preview what's next below." : 'Nothing was scheduled this day.'}
            </Text>
          </View>
        )}

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>This Week's Program</Text>
          {sessionKeys.map((key, i) => {
            const sess = sessions[key];
            const active = key === viewSessionKey;
            return (
              <SessionTimelineCard
                key={key}
                dayLabel={`${sess.day}${active ? (isViewingToday() ? ' · Today' : ' · Viewing') : ''}`}
                name={key}
                meta={`${sess.muscleGroups.map((m) => m.name).join(', ')} · ${sess.exercises.length} exercises`}
                active={active}
                isLast={i === sessionKeys.length - 1}
                showStart={active && isViewingToday()}
                onPress={() => openSession(key)}
              />
            );
          })}
        </View>
      </ScrollView>
      <TrackerTabBar active="StrengthTab" />
      <NewSessionSheet />
      <AddSetSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  statRow: { flexDirection: 'row', gap: 8 },
  restBlock: { backgroundColor: colors.surface, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 18 },
  restKicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 3, fontFamily: fonts.regular },
  restTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  restSub: { fontSize: 12.5, color: colors.neutral500, marginTop: 3, fontFamily: fonts.regular },
});
