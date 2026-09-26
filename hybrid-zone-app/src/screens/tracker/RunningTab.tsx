import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarWeekWidget } from '@/components/tracker/CalendarWeekWidget';
import { MetricTile } from '@/components/tracker/MetricTile';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { TrPlayIcon, TrRunSmallIcon, TrSlidersIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP, DAY_LABELS } from '@/engine/calendar';
import { daysBetween, startOfWeekMonday } from '@/engine/dates';
import { useTrackerStore, OVERVIEW_METRICS } from '@/store/trackerStore';
import { fmtDistance, fmtPaceFromSecPerKm } from '@/engine/units';
import { activityWhen } from '@/engine/records';
import { useMetrics } from '@/hooks/useStats';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

const RUN_LIGHT = '#4da3ff';
const BAR_MAX_H = 64;

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

  // Distance run on each day of the current week (Mon..Sun), from saved runs.
  const week = useMemo(() => {
    const start = startOfWeekMonday(Date.now());
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    let runs = 0;
    activities.forEach((a) => {
      if (a.type !== 'running' || !a.runStats) return;
      const i = daysBetween(start, a.date);
      if (i < 0 || i > 6) return;
      perDay[i] += a.runStats.distance;
      runs += 1;
    });
    const total = perDay.reduce((n, v) => n + v, 0);
    return { perDay, runs, total, max: Math.max(0.1, ...perDay), todayIndex: daysBetween(start, Date.now()) };
  }, [activities]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CalendarWeekWidget />

        <View style={styles.heroCard}>
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="runHeroBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#0d4f9e" />
                <Stop offset="1" stopColor="#06264d" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#runHeroBg)" />
          </Svg>
          <Svg style={styles.heroRoute} width={230} height={120} viewBox="0 0 230 120">
            <Path d="M4 100 C 34 92, 40 56, 72 62 S 110 104, 138 78 S 168 22, 226 14" fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={5} strokeLinecap="round" />
            <Path d="M4 100 C 34 92, 40 56, 72 62 S 110 104, 138 78 S 168 22, 226 14" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="2 7" />
          </Svg>
          <View style={styles.heroBody}>
            <View style={styles.heroPill}>
              <View style={styles.heroPillDot} />
              <Text style={styles.heroPillText}>{viewRun ? `${dayLabel}'s run` : today ? 'Outdoor run' : dayLabel}</Text>
            </View>
            <Text style={styles.heroTitle}>{viewRun ? viewRun.type : today ? 'Ready when you are' : 'No run scheduled'}</Text>
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
                  <TrPlayIcon size={15} color="#06264d" />
                  <Text style={styles.heroBtnText}>Start Run</Text>
                </Pressable>
                <Pressable style={styles.settingsBtn} onPress={openRunSetup}>
                  <TrSlidersIcon size={18} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekHead}>
            <View>
              <Text style={styles.weekKicker}>THIS WEEK</Text>
              <Text style={styles.weekTotal}>{fmtDistance(week.total, unitSystem)}</Text>
            </View>
            <Text style={styles.weekRuns}>{week.runs === 1 ? '1 run' : `${week.runs} runs`}</Text>
          </View>
          <View style={styles.weekBars}>
            {week.perDay.map((v, i) => {
              const planned = Boolean(runSessions[DAY_LABELS[i]]);
              const isToday = i === week.todayIndex;
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={styles.weekBarTrack}>
                    <View
                      style={[
                        styles.weekBar,
                        {
                          height: v > 0 ? Math.max(8, (v / week.max) * BAR_MAX_H) : planned ? 24 : 6,
                          backgroundColor: v > 0 ? RUN_LIGHT : planned ? 'transparent' : colors.neutral300,
                          borderWidth: v === 0 && planned ? 1.5 : 0,
                          borderColor: RUN_LIGHT,
                          borderStyle: 'dashed',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>{DAY_LABELS[i][0]}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.weekLegend}>Dashed outline = a run planned for that day</Text>
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
                      <TrRunSmallIcon size={18} color={RUN_LIGHT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{a.title}</Text>
                      <Text style={styles.activityMeta}>
                        {Math.round(rs.duration)} min · {pace}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.activityDist}>{fmtDistance(rs.distance, unitSystem)}</Text>
                      <Text style={styles.activityTime}>{activityWhen(a)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyRuns}>
              <TrRunSmallIcon size={22} color={RUN_LIGHT} />
              <Text style={styles.emptyRunsTitle}>No runs yet</Text>
              <Text style={styles.activityMeta}>Tap Start Run and your route, pace and distance will show up here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <TrackerTabBar active="RunningTab" />
    </SafeAreaView>
  );
}

function HeroStat({ val, lbl }: { val: string; lbl: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatVal} numberOfLines={1} adjustsFontSizeToFit>
        {val}
      </Text>
      <Text style={styles.heroStatLbl}>{lbl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  heroCard: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#0a3a75' },
  heroRoute: { position: 'absolute', right: -8, top: 10 },
  heroBody: { padding: 20 },
  heroPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5dd67d' },
  heroPillText: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.4, color: '#fff' },
  heroTitle: { fontFamily: fonts.semiBold, fontSize: 26, lineHeight: 31, color: '#fff', marginTop: 14, marginBottom: 18, maxWidth: '80%' },
  statsRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 12 },
  heroStatVal: { fontFamily: fonts.semiBold, fontSize: 17, color: '#fff' },
  heroStatLbl: { fontFamily: fonts.regular, fontSize: 10.5, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 15 },
  heroBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#06264d' },
  settingsBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  weekCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18 },
  weekHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  weekKicker: { fontFamily: fonts.semiBold, fontSize: 10.5, letterSpacing: 0.9, color: colors.neutral500 },
  weekTotal: { fontFamily: fonts.semiBold, fontSize: 30, color: colors.text, marginTop: 3 },
  weekRuns: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral500, marginBottom: 4 },
  weekBars: { flexDirection: 'row', gap: 8 },
  weekCol: { flex: 1, alignItems: 'center', gap: 8 },
  weekBarTrack: { height: BAR_MAX_H, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  weekBar: { width: '70%', borderRadius: 7 },
  weekDay: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.neutral500 },
  weekDayToday: { color: colors.text, fontFamily: fonts.bold },
  weekLegend: { fontFamily: fonts.regular, fontSize: 11, color: colors.neutral500, marginTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 12 },
  activityIco: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(77,163,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
  activityMeta: { fontSize: 12, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  activityDist: { fontSize: 15, color: colors.text, fontFamily: fonts.semiBold },
  activityTime: { fontSize: 11, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  emptyRuns: { backgroundColor: colors.surface, borderRadius: 20, padding: 22, alignItems: 'center', gap: 6 },
  emptyRunsTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, marginTop: 4 },
});
