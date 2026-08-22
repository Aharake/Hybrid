import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarWeekWidget } from '@/components/tracker/CalendarWeekWidget';
import { RingCluster } from '@/components/tracker/RingCluster';
import { MetricTile } from '@/components/tracker/MetricTile';
import { HeroCard } from '@/components/tracker/HeroCard';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { NewSessionSheet } from '@/components/tracker/NewSessionSheet';
import { MetricDetailSheet } from '@/components/tracker/MetricDetailSheet';
import { TrRunSmallIcon, TrStrengthIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, OVERVIEW_METRICS, RUN_SESSIONS } from '@/store/trackerStore';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

export function HomeTab() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { sessions, viewDay, isViewingToday, enabled, setOverviewContext } = useTrackerStore();

  const sessionKeys = Object.keys(sessions) as (keyof typeof sessions)[];
  const viewDayFull = DAY_FULL_MAP[viewDay];
  const viewStrengthKey = sessionKeys.find((key) => sessions[key].day === viewDayFull) || null;
  const viewRun = RUN_SESSIONS[viewDay] || null;
  const dayLabel = isViewingToday() ? 'Today' : viewDayFull;

  const strengthCard = viewStrengthKey
    ? {
        kicker: `${dayLabel} · Strength`,
        title: viewStrengthKey,
        sub: `${sessions[viewStrengthKey].muscleGroups.map((m) => m.name).join(', ')} · ${sessions[viewStrengthKey].exercises.length} exercises · ${sessions[viewStrengthKey].duration} min`,
      }
    : null;
  const runCard = viewRun
    ? {
        kicker: `${dayLabel} · Running`,
        title: viewRun.type,
        sub: `${viewRun.distance} km · ${viewRun.duration} min · ${viewRun.zoneTag}`,
      }
    : null;

  const goToStrength = () => navigation.reset({ index: 0, routes: [{ name: 'StrengthTab' }] });
  const goToRunning = () => navigation.reset({ index: 0, routes: [{ name: 'RunningTab' }] });

  const homeMetrics = OVERVIEW_METRICS.home.filter((m) => enabled.home[m.id]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CalendarWeekWidget />
        <RingCluster />

        {strengthCard && runCard ? (
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <HeroCard {...strengthCard} ctaLabel="Go to Workout" onPressCta={goToStrength} />
            </View>
            <View style={{ flex: 1 }}>
              <HeroCard {...runCard} ctaLabel="Go to Run" onPressCta={goToRunning} />
            </View>
          </View>
        ) : strengthCard ? (
          <HeroCard {...strengthCard} ctaLabel="Go to Workout" onPressCta={goToStrength} />
        ) : runCard ? (
          <HeroCard {...runCard} ctaLabel="Go to Run" onPressCta={goToRunning} />
        ) : (
          <HeroCard kicker={dayLabel} title="Rest Day" sub="Nothing scheduled — recover and come back stronger." restVariant />
        )}

        <View>
          <View style={styles.rowBetween}>
            <Text style={typography.sectionTitle}>Weekly Overview</Text>
            <TrackerLink
              label="View All"
              onPress={() => {
                setOverviewContext('home');
                navigation.navigate('ViewAllOverview');
              }}
            />
          </View>
          <View style={styles.metricsGrid}>
            {homeMetrics.map((m) => (
              <MetricTile key={m.id} icon={m.icon} label={m.label} value={m.value} unit={m.unit} big={m.big} bars={m.bars} widthPct={m.big ? 48 : 31} />
            ))}
          </View>
        </View>

        <View>
          <View style={styles.rowBetween}>
            <Text style={typography.sectionTitle}>Recent Activity</Text>
            <TrackerLink label="View All" onPress={() => navigation.navigate('AllActivities')} />
          </View>
          <View style={{ gap: 8 }}>
            <View style={styles.activityRow}>
              <View style={styles.activityIco}>
                <TrStrengthIcon size={17} color={colors.accent200} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Push Day Strength</Text>
                <Text style={styles.activityMeta}>Strength · 45 min</Text>
              </View>
              <Text style={styles.activityTime}>8:15 AM</Text>
            </View>
            <View style={styles.activityRow}>
              <View style={styles.activityIco}>
                <TrRunSmallIcon size={17} color={colors.accent200} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Outdoor Tempo Run</Text>
                <Text style={styles.activityMeta}>Cardio · 5.2 km</Text>
              </View>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <TrackerTabBar active="HomeTab" />
      <NewSessionSheet />
      <MetricDetailSheet />
    </SafeAreaView>
  );
}

function TrackerLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.link}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  heroRow: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 11 },
  activityIco: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  activityMeta: { fontSize: 11.5, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  activityTime: { fontSize: 11, color: colors.neutral500, fontFamily: fonts.regular },
});
