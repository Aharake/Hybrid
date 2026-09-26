import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarWeekWidget } from '@/components/tracker/CalendarWeekWidget';
import { MetricTile } from '@/components/tracker/MetricTile';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { TrPlayIcon, TrRunSmallIcon, TrSlidersIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { addDays, shortDate, startOfWeekMonday } from '@/engine/dates';
import { useTrackerStore, sortedMetrics } from '@/store/trackerStore';
import { fmtDistance, fmtPaceFromSecPerKm, UnitSystem } from '@/engine/units';
import { activityWhen } from '@/engine/records';
import { useMetrics } from '@/hooks/useStats';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

const RUN_LIGHT = '#4da3ff';
const WEEKS_SHOWN = 6;
const SNAP_BAR_H = 84;

export function RunningTab() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { runSessions, viewDay, isViewingToday, enabled, order, setOverviewContext, openRunTracker, openRunSetup, unitSystem, activities, openActivityDetail } =
    useTrackerStore();

  const viewRun = runSessions[viewDay] || null;
  const dayLabel = isViewingToday() ? 'Today' : DAY_FULL_MAP[viewDay];
  const today = isViewingToday();
  const metrics = useMetrics();
  const runningMetrics = sortedMetrics('running', order.running).filter((m) => enabled.running[m.id]);
  const recentRuns = activities.filter((a) => a.type === 'running' && a.runStats).slice(0, 4);

  // Distance and time for this week and the five before it, from saved runs.
  const [snapMetric, setSnapMetric] = useState<'distance' | 'time'>('distance');
  const weeks = useMemo(() => {
    const thisMonday = startOfWeekMonday(Date.now());
    const buckets = Array.from({ length: WEEKS_SHOWN }, (_, i) => ({
      start: addDays(thisMonday, -(WEEKS_SHOWN - 1 - i) * 7),
      km: 0,
      min: 0,
      runs: 0,
    }));
    activities.forEach((a) => {
      if (a.type !== 'running' || !a.runStats) return;
      const b = buckets.find((w) => a.date >= w.start && a.date < addDays(w.start, 7));
      if (!b) return;
      b.km += a.runStats.distance;
      b.min += a.runStats.duration;
      b.runs += 1;
    });
    return buckets;
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

        <WeeklySnapshot weeks={weeks} metric={snapMetric} onMetric={setSnapMetric} unitSystem={unitSystem} />

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

function fmtMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

interface Week {
  start: number;
  km: number;
  min: number;
  runs: number;
}

// This week against the last five, for distance or for time on your feet.
function WeeklySnapshot({ weeks, metric, onMetric, unitSystem }: { weeks: Week[]; metric: 'distance' | 'time'; onMetric: (m: 'distance' | 'time') => void; unitSystem: UnitSystem }) {
  const value = (w: Week) => (metric === 'distance' ? w.km : w.min);
  const current = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];
  const now = value(current);
  const before = value(previous);
  const max = Math.max(0.01, ...weeks.map(value));
  const headline = metric === 'distance' ? fmtDistance(now, unitSystem) : fmtMinutes(now);

  let trend: { text: string; up: boolean } | null = null;
  if (before > 0) {
    const pct = Math.round(((now - before) / before) * 100);
    trend = { text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs last week`, up: pct >= 0 };
  } else if (now > 0) {
    trend = { text: 'Nothing logged last week', up: true };
  }

  return (
    <View style={styles.snapCard}>
      <View style={styles.snapHead}>
        <Text style={styles.snapTitle}>Weekly Snapshot</Text>
        <View style={styles.snapSeg}>
          {(['distance', 'time'] as const).map((m) => (
            <Pressable key={m} style={[styles.snapSegItem, metric === m && styles.snapSegItemActive]} onPress={() => onMetric(m)}>
              <Text style={[styles.snapSegText, metric === m && styles.snapSegTextActive]}>{m === 'distance' ? 'Distance' : 'Time'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.snapNumRow}>
        <Text style={styles.snapNum}>{headline}</Text>
        {trend && <Text style={[styles.snapTrend, { color: trend.up ? colors.green : colors.neutral500 }]}>{trend.text}</Text>}
      </View>
      <Text style={styles.snapSub}>
        {current.runs === 1 ? '1 run' : `${current.runs} runs`} this week
      </Text>

      <View style={styles.snapBars}>
        {weeks.map((w, i) => {
          const v = value(w);
          const isNow = i === weeks.length - 1;
          return (
            <View key={w.start} style={styles.snapCol}>
              <View style={styles.snapBarTrack}>
                <View style={[styles.snapBar, { height: v > 0 ? Math.max(8, (v / max) * SNAP_BAR_H) : 4, backgroundColor: isNow ? RUN_LIGHT : v > 0 ? 'rgba(77,163,255,0.4)' : colors.neutral300 }]} />
              </View>
              <Text style={[styles.snapLbl, isNow && styles.snapLblNow]}>{isNow ? 'This wk' : shortDate(w.start)}</Text>
            </View>
          );
        })}
      </View>
    </View>
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
  snapCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18 },
  snapHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  snapTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  snapSeg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 999, padding: 3 },
  snapSegItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  snapSegItemActive: { backgroundColor: colors.text },
  snapSegText: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500 },
  snapSegTextActive: { color: colors.bg },
  snapNumRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  snapNum: { fontFamily: fonts.semiBold, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  snapTrend: { fontFamily: fonts.semiBold, fontSize: 12.5 },
  snapSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500, marginTop: 2, marginBottom: 18 },
  snapBars: { flexDirection: 'row', gap: 8 },
  snapCol: { flex: 1, alignItems: 'center', gap: 8 },
  snapBarTrack: { height: SNAP_BAR_H, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  snapBar: { width: '72%', borderRadius: 7 },
  snapLbl: { fontFamily: fonts.medium, fontSize: 10, color: colors.neutral500 },
  snapLblNow: { color: colors.text, fontFamily: fonts.bold },
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
