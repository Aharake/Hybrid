import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarWeekWidget } from '@/components/tracker/CalendarWeekWidget';
import { MetricTile } from '@/components/tracker/MetricTile';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { TrPlayIcon, TrRunSmallIcon, TrSlidersIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, OVERVIEW_METRICS } from '@/store/trackerStore';
import { fmtDistance, fmtPaceFromSecPerKm } from '@/engine/units';
import { activityWhen } from '@/engine/records';
import { useMetrics } from '@/hooks/useStats';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

export function RunningTab() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { runSessions, viewDay, isViewingToday, enabled, setOverviewContext, openRunTracker, openRunSetup, unitSystem, activities, openActivityDetail } =
    useTrackerStore();

  const viewRun = runSessions[viewDay] || null;
  const dayLabel = isViewingToday() ? 'Today' : DAY_FULL_MAP[viewDay];
  const today = isViewingToday();
  const metrics = useMetrics();
  const runningMetrics = OVERVIEW_METRICS.running.filter((m) => enabled.running[m.id]);
  const recentRuns = activities.filter((a) => a.type === 'running' && a.runStats).slice(0, 4);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CalendarWeekWidget />

        <View style={styles.heroCard}>
          <View style={styles.heroMap}>
            <Svg width="100%" height={34} viewBox="0 0 340 34" preserveAspectRatio="none" style={StyleSheet.absoluteFillObject}>
              <Defs>
                <LinearGradient id="routeFade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor={colors.bg} stopOpacity={0.1} />
                  <Stop offset="100%" stopColor={colors.bg} stopOpacity={0.35} />
                </LinearGradient>
              </Defs>
              <Path d="M-10 27 C 40 8, 70 30, 120 18 S 200 4, 240 19 S 300 10, 350 12" fill="none" stroke="url(#routeFade)" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroKicker}>{viewRun ? `${dayLabel}'s Run` : today ? 'Outdoor Workout' : dayLabel}</Text>
            <Text style={styles.heroTitle}>{viewRun ? viewRun.type : today ? 'Ready when you are' : 'No Run Scheduled'}</Text>
            <View style={styles.statsRow}>
              {viewRun ? (
                <>
                  <HeroStat val={fmtDistance(viewRun.distance, unitSystem)} lbl="Target" />
                  <HeroStat val={`${viewRun.duration} min`} lbl="Duration" />
                  <HeroStat val={viewRun.pace} lbl="Effort" />
                </>
              ) : (
                <>
                  <HeroStat val={`${metrics.running.weekly_dist.value} ${metrics.running.weekly_dist.unit}`} lbl="This week" />
                  <HeroStat val={metrics.running.avg_pace.value === '—' ? '—' : `${metrics.running.avg_pace.value}${metrics.running.avg_pace.unit}`} lbl="Avg pace (30d)" />
                  <HeroStat val={metrics.running.runs_monthly.value} lbl="Runs this month" />
                </>
              )}
            </View>
            {today && (
              <View style={styles.heroActions}>
                <Pressable style={styles.heroBtn} onPress={openRunTracker}>
                  <TrPlayIcon size={12} color={colors.text} />
                  <Text style={styles.heroBtnText}>Start Run</Text>
                </Pressable>
                <Pressable style={styles.settingsBtn} onPress={openRunSetup}>
                  <TrSlidersIcon size={15} color={colors.bg} />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View>
          <View style={styles.rowBetween}>
            <Text style={typography.sectionTitle}>Overview</Text>
            <Text
              style={styles.link}
              onPress={() => {
                setOverviewContext('running');
                navigation.navigate('ViewAllOverview');
              }}
            >
              View All
            </Text>
          </View>
          <View style={styles.metricsGrid}>
            {runningMetrics.map((m) => {
              const r = metrics.running[m.id];
              return <MetricTile key={m.id} icon={m.icon} label={r.label ?? m.label} value={r.value} unit={r.unit} widthPct={48} />;
            })}
          </View>
        </View>

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Recent Runs</Text>
          {recentRuns.length ? (
            <View style={{ gap: 8 }}>
              {recentRuns.map((a) => {
                const rs = a.runStats!;
                const pace = fmtPaceFromSecPerKm((rs.duration * 60) / rs.distance, unitSystem);
                return (
                  <Pressable
                    key={a.date}
                    style={styles.activityRow}
                    onPress={() => {
                      openActivityDetail(activities.indexOf(a));
                      navigation.navigate('RunDetail');
                    }}
                  >
                    <View style={styles.activityIco}>
                      <TrRunSmallIcon size={17} color={colors.accent200} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{a.title}</Text>
                      <Text style={styles.activityMeta}>
                        {fmtDistance(rs.distance, unitSystem)} · {Math.round(rs.duration)} min · {pace}
                      </Text>
                    </View>
                    <Text style={styles.activityTime}>{activityWhen(a)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.activityMeta}>Your recorded runs will show up here.</Text>
          )}
        </View>
      </ScrollView>
      <TrackerTabBar active="RunningTab" />
    </SafeAreaView>
  );
}

function HeroStat({ val, lbl }: { val: string; lbl: string }) {
  return (
    <View style={{ marginRight: 12 }}>
      <Text style={styles.heroStatVal}>{val}</Text>
      <Text style={styles.heroStatLbl}>{lbl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  heroCard: { borderRadius: 26, backgroundColor: colors.text, overflow: 'hidden' },
  heroMap: { position: 'relative', height: 34 },
  gpsPill: { position: 'absolute', left: 11, top: 7, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  gpsDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.bg },
  gpsPillText: { fontSize: 8.5, fontFamily: fonts.semiBold, color: colors.bg },
  heroBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  heroKicker: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.bg, opacity: 0.55, marginBottom: 2, fontFamily: fonts.regular },
  heroTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.bg, marginBottom: 6 },
  statsRow: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' },
  heroStatVal: { fontFamily: fonts.semiBold, fontSize: 11.5, color: colors.bg },
  heroStatLbl: { fontSize: 8.5, color: colors.bg, opacity: 0.55, marginTop: 1 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  heroBtnText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.text },
  settingsBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 11 },
  activityIco: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  activityMeta: { fontSize: 11.5, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  activityTime: { fontSize: 11, color: colors.neutral500, fontFamily: fonts.regular },
});
