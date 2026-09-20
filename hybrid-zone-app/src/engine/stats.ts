// Every number the tracker shows — overview tiles, rings, streaks, highlights —
// computed here from what the user has actually logged (workouts, runs, other
// activities) plus health-app readings when connected. Nothing in this file
// is a placeholder: with no data the answer is "—" or 0, never an invented
// value.
import type { HealthSnapshot } from './health';
import { DAY_LABELS, DayLabel, FULL_TO_DAY_LABEL } from './calendar';
import { dayKey, DAY_MS, startOfDay, startOfWeekMonday } from './dates';
import { groupOfExercise } from './exerciseLibrary';
import { elevationGainM, routeHasAltitude } from './gps';
import { ActivityItem, RunSessionPlan, Session, WorkoutLogRecord } from './records';
import { computeRecords } from './achievements';
import { UnitSystem, distanceUnitLabel, distanceValueOnly, fmtPaceFromSecPerKm, weightUnitLabel, weightValueOnly } from './units';

export interface StatsInput {
  now: number;
  activities: ActivityItem[]; // every activity, strength included (derived from workoutLogs)
  workoutLogs: WorkoutLogRecord[];
  sessions: Record<string, Session>;
  runSessions: Partial<Record<DayLabel, RunSessionPlan>>;
  health: HealthSnapshot | null;
  unitSystem: UnitSystem;
}

export interface MetricResult {
  value: string; // already formatted for display; '—' when there's no data
  unit: string;
  label?: string; // overrides the tile's default label (e.g. the name of your top lift)
  bars?: number[]; // 0-100 bar heights for the "big" chart tiles
}

export type MetricContext = 'home' | 'strength' | 'running';
export type MetricBook = Record<MetricContext, Record<string, MetricResult>>;

const NONE: MetricResult = { value: '—', unit: '' };
const STEP_GOAL = 10_000;

/* ---------------- helpers ---------------- */

function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

// [start, end) of the Monday-based week `offset` weeks from the one containing `now`.
export function weekBounds(now: number, offset: number): { start: number; end: number } {
  const start = addDays(startOfWeekMonday(now), offset * 7);
  return { start, end: addDays(start, 7) };
}

function inRange(ts: number, start: number, end: number): boolean {
  return ts >= start && ts < end;
}

function activityMinutes(a: ActivityItem): number {
  if (a.runStats) return a.runStats.duration;
  if (a.otherStats) return a.otherStats.duration;
  if (a.strengthStats) return a.strengthStats.duration ?? 0;
  return 0;
}

function volumeKg(logs: WorkoutLogRecord[], start: number, end: number): number {
  let total = 0;
  for (const log of logs) {
    if (!inRange(log.date, start, end)) continue;
    for (const s of log.sets) total += s.weight * s.reps;
  }
  return total;
}

function formatVolume(kg: number, unitSystem: UnitSystem): string {
  const v = unitSystem === 'imperial' ? kg * 2.20462 : kg;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function runsOf(activities: ActivityItem[]): ActivityItem[] {
  return activities.filter((a) => a.type === 'running' && a.runStats);
}

// Consecutive-day streaks over a set of local day keys ("2026-09-20").
function keyToTs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function streaks(days: Set<string>, now: number): { current: number; longest: number } {
  if (days.size === 0) return { current: 0, longest: 0 };
  // Still alive if you've done something today or yesterday.
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...days].map(keyToTs).sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = Math.round((sorted[i] - sorted[i - 1]) / DAY_MS) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

function activeDaySet(activities: ActivityItem[], type?: ActivityItem['type']): Set<string> {
  return new Set(activities.filter((a) => !type || a.type === type).map((a) => dayKey(a.date)));
}

function plannedCounts(sessions: Record<string, Session>, runSessions: Partial<Record<DayLabel, RunSessionPlan>>) {
  const strength = Object.values(sessions).filter((s) => FULL_TO_DAY_LABEL[s.day]).length;
  return { strength, runs: Object.keys(runSessions).length };
}

/* ---------------- rings (goal / consistency / volume) ---------------- */

export interface RingValues {
  goal: number; // 0-1
  consistency: number; // 0-1
  volume: number; // 0+ (over 1 = more than last week)
}

export function computeRings(input: StatsInput, weekOffset: number): RingValues {
  const { now, activities, workoutLogs, sessions, runSessions, health } = input;
  const { start, end } = weekBounds(now, weekOffset);
  const inWeek = activities.filter((a) => inRange(a.date, start, end));
  const planned = plannedCounts(sessions, runSessions);

  // Weekly goal: average of workouts, runs and (when Health is connected)
  // steps, each capped at 100% so one can't cover for another.
  const parts: number[] = [];
  if (planned.strength > 0) parts.push(Math.min(1, inWeek.filter((a) => a.type === 'strength').length / planned.strength));
  if (planned.runs > 0) parts.push(Math.min(1, inWeek.filter((a) => a.type === 'running').length / planned.runs));
  if (weekOffset === 0 && health?.steps != null) parts.push(Math.min(1, health.steps / STEP_GOAL));
  const goal = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;

  // Consistency: scheduled sessions done ON their scheduled day.
  let slots = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const label = DAY_LABELS[i];
    const key = dayKey(addDays(start, i));
    const dayActs = inWeek.filter((a) => dayKey(a.date) === key);
    if (Object.values(sessions).some((s) => FULL_TO_DAY_LABEL[s.day] === label)) {
      slots++;
      if (dayActs.some((a) => a.type === 'strength')) done++;
    }
    if (runSessions[label]) {
      slots++;
      if (dayActs.some((a) => a.type === 'running')) done++;
    }
  }
  const consistency = slots > 0 ? done / slots : 0;

  // Volume: lifted this week vs last week.
  const thisVol = volumeKg(workoutLogs, start, end);
  const prev = weekBounds(now, weekOffset - 1);
  const prevVol = volumeKg(workoutLogs, prev.start, prev.end);
  const volume = prevVol > 0 ? thisVol / prevVol : thisVol > 0 ? 1 : 0;

  return { goal, consistency, volume };
}

// Account → Data Highlights: your best consistency and peak training load
// (a week's volume vs the average of the weeks before it) inside the range.
export function computeDataHighlights(input: StatsInput, range: '1m' | '3m' | 'all'): { consistency: number; load: number } {
  const { now, activities, workoutLogs } = input;
  if (activities.length === 0) return { consistency: 0, load: 0 };
  const firstWeekOffset = Math.round((startOfWeekMonday(Math.min(...activities.map((a) => a.date))) - startOfWeekMonday(now)) / (7 * DAY_MS));
  const span = range === '1m' ? 4 : range === '3m' ? 13 : Infinity;
  const from = Math.max(firstWeekOffset, span === Infinity ? firstWeekOffset : -(span - 1));

  let bestConsistency = 0;
  let peakLoad = 0;
  for (let off = from; off <= 0; off++) {
    const { start, end } = weekBounds(now, off);
    if (!activities.some((a) => inRange(a.date, start, end))) continue;
    bestConsistency = Math.max(bestConsistency, computeRings(input, off).consistency);

    const vol = volumeKg(workoutLogs, start, end);
    const priorVols: number[] = [];
    for (let k = 1; k <= 4; k++) {
      const b = weekBounds(now, off - k);
      const v = volumeKg(workoutLogs, b.start, b.end);
      if (v > 0) priorVols.push(v);
    }
    if (vol > 0 && priorVols.length) peakLoad = Math.max(peakLoad, vol / (priorVols.reduce((a, b) => a + b, 0) / priorVols.length));
  }
  return { consistency: bestConsistency, load: peakLoad };
}

/* ---------------- per-metric values ---------------- */

function personalRecordsThisWeek(logs: WorkoutLogRecord[], start: number, end: number): number {
  const before = new Map<string, number>();
  const during = new Map<string, number>();
  for (const log of logs) {
    for (const s of log.sets) {
      const key = s.exerciseName.toLowerCase();
      if (log.date < start) before.set(key, Math.max(before.get(key) ?? 0, s.weight));
      else if (log.date < end) during.set(key, Math.max(during.get(key) ?? 0, s.weight));
    }
  }
  let prs = 0;
  // Only counts as a PR when there's earlier history to beat — a first-ever
  // log of an exercise isn't a record, it's just a baseline.
  during.forEach((w, key) => {
    if (before.has(key) && w > (before.get(key) as number)) prs++;
  });
  return prs;
}

// The lift you log most, and how its heaviest set moved over the last 30 days
// versus the 30 before.
function topLiftTrend(logs: WorkoutLogRecord[], now: number): { name: string; deltaKg: number } | null {
  const recentStart = now - 30 * DAY_MS;
  const priorStart = now - 60 * DAY_MS;
  const sessionCount = new Map<string, { name: string; n: number }>();
  for (const log of logs) {
    if (log.date < priorStart) continue;
    const seen = new Set<string>();
    for (const s of log.sets) {
      const key = s.exerciseName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = sessionCount.get(key) ?? { name: s.exerciseName, n: 0 };
      cur.n++;
      sessionCount.set(key, cur);
    }
  }
  const top = [...sessionCount.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  if (!top) return null;
  let recent = 0;
  let prior = 0;
  for (const log of logs) {
    for (const s of log.sets) {
      if (s.exerciseName.toLowerCase() !== top[0]) continue;
      if (log.date >= recentStart) recent = Math.max(recent, s.weight);
      else if (log.date >= priorStart) prior = Math.max(prior, s.weight);
    }
  }
  if (recent === 0 || prior === 0) return null;
  return { name: top[1].name, deltaKg: recent - prior };
}

function musclesTrainedThisWeek(logs: WorkoutLogRecord[], sessions: Record<string, Session>, start: number, end: number): number {
  const groupByName = new Map<string, string>();
  Object.values(sessions).forEach((s) => s.exercises.forEach((e) => groupByName.set(e.name.toLowerCase(), e.group)));
  const groups = new Set<string>();
  for (const log of logs) {
    if (!inRange(log.date, start, end)) continue;
    for (const s of log.sets) {
      const g = groupByName.get(s.exerciseName.toLowerCase()) ?? groupOfExercise(s.exerciseName);
      if (g && g !== 'Custom') groups.add(g);
    }
  }
  return groups.size;
}

export function computeMetrics(input: StatsInput): MetricBook {
  const { now, activities, workoutLogs, sessions, runSessions, health, unitSystem } = input;
  const wk = weekBounds(now, 0);
  const todayStart = startOfDay(now);
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const thirtyDaysAgo = now - 30 * DAY_MS;

  const thisWeek = activities.filter((a) => inRange(a.date, wk.start, wk.end));
  const planned = plannedCounts(sessions, runSessions);
  const anyStreaks = streaks(activeDaySet(activities), now);
  const runs = runsOf(activities);

  // Minutes of activity per weekday this week → the Weekly Trend bars.
  const minutesByDay = DAY_LABELS.map((_, i) => {
    const key = dayKey(addDays(wk.start, i));
    return activities.filter((a) => dayKey(a.date) === key).reduce((sum, a) => sum + activityMinutes(a), 0);
  });
  const maxMinutes = Math.max(...minutesByDay);
  const trendBars = maxMinutes > 0 ? minutesByDay.map((m) => Math.max(6, Math.round((m / maxMinutes) * 100))) : undefined;

  const todayMinutes = activities.filter((a) => inRange(a.date, todayStart, todayStart + DAY_MS)).reduce((sum, a) => sum + activityMinutes(a), 0);
  const doneThisWeek = thisWeek.filter((a) => a.type === 'strength' || a.type === 'running').length;
  const plannedTotal = planned.strength + planned.runs;

  const home: Record<string, MetricResult> = {
    burn: health?.activeCalories != null ? { value: fmtInt(health.activeCalories), unit: 'kcal' } : NONE,
    active: todayMinutes > 0 ? { value: String(Math.round(todayMinutes)), unit: 'min' } : { value: '0', unit: 'min' },
    done: plannedTotal > 0 ? { value: String(doneThisWeek), unit: `/${plannedTotal}` } : { value: String(doneThisWeek), unit: 'this wk' },
    heartrate: health?.heartRateBars ? { value: health.avgHeartRate != null ? String(health.avgHeartRate) : '', unit: 'bpm', bars: health.heartRateBars } : NONE,
    trend: trendBars ? { value: '', unit: '', bars: trendBars } : NONE,
    steps: health?.steps != null ? { value: fmtInt(health.steps), unit: '' } : NONE,
    sleep: health?.sleepMinutes != null ? { value: `${Math.floor(health.sleepMinutes / 60)}h ${health.sleepMinutes % 60}m`, unit: '' } : NONE,
    workouts_month: { value: String(activities.filter((a) => a.date >= monthStart).length), unit: 'this mo' },
    longest_streak: { value: String(anyStreaks.longest), unit: anyStreaks.longest === 1 ? 'day' : 'days' },
    active_days: { value: String(activeDaySet(thisWeek).size), unit: '/7' },
  };

  const strengthLogsWeek = workoutLogs.filter((l) => inRange(l.date, wk.start, wk.end));
  const withDuration = workoutLogs.filter((l) => l.durationSec != null && l.durationSec > 0);
  const topLift = topLiftTrend(workoutLogs, now);
  const strengthStreak = streaks(activeDaySet(activities, 'strength'), now).current;
  const wUnit = weightUnitLabel(unitSystem);

  const strength: Record<string, MetricResult> = {
    volume: { value: formatVolume(volumeKg(workoutLogs, wk.start, wk.end), unitSystem), unit: wUnit },
    logged: { value: String(workoutLogs.length), unit: '' },
    done: NONE, // shown live from today's session by the Strength tab
    prs: { value: String(personalRecordsThisWeek(workoutLogs, wk.start, wk.end)), unit: '' },
    total_sets: { value: String(strengthLogsWeek.reduce((n, l) => n + l.sets.length, 0)), unit: 'this wk' },
    avg_duration: withDuration.length
      ? { value: String(Math.round(withDuration.reduce((n, l) => n + (l.durationSec as number), 0) / withDuration.length / 60)), unit: 'min' }
      : NONE,
    workout_streak: { value: String(strengthStreak), unit: strengthStreak === 1 ? 'day' : 'days' },
    main_lift: topLift
      ? {
          value: `${topLift.deltaKg > 0 ? '+' : ''}${weightValueOnly(topLift.deltaKg, unitSystem, 0)}`,
          unit: `${wUnit}/mo`,
          label: topLift.name,
        }
      : { value: '—', unit: '', label: 'Top Lift' },
    muscle_groups: { value: String(musclesTrainedThisWeek(workoutLogs, sessions, wk.start, wk.end)), unit: 'this wk' },
  };

  const runsThisWeek = runs.filter((a) => inRange(a.date, wk.start, wk.end));
  const runsLast30 = runs.filter((a) => a.date >= thirtyDaysAgo);
  const km30 = runsLast30.reduce((n, a) => n + (a.runStats as NonNullable<ActivityItem['runStats']>).distance, 0);
  const min30 = runsLast30.reduce((n, a) => n + (a.runStats as NonNullable<ActivityItem['runStats']>).duration, 0);
  const avgPaceSecPerKm = km30 > 0 ? (min30 * 60) / km30 : null;
  const weekRoutes = runsThisWeek.map((a) => a.runStats?.route ?? []).filter((r) => r.length > 1);
  const hasElevation = weekRoutes.some(routeHasAltitude);
  const climbM = weekRoutes.reduce((n, r) => n + elevationGainM(r), 0);
  const runStreak = streaks(activeDaySet(activities, 'running'), now).current;
  const fastest5k = computeRecords(runs).find((r) => r.id === 'pr5k');
  const longest = runs.reduce((m, a) => Math.max(m, (a.runStats as NonNullable<ActivityItem['runStats']>).distance), 0);
  const dUnit = distanceUnitLabel(unitSystem);

  const running: Record<string, MetricResult> = {
    steps_today: health?.steps != null ? { value: fmtInt(health.steps), unit: '/10k' } : NONE,
    weekly_dist: {
      value: distanceValueOnly(runsThisWeek.reduce((n, a) => n + (a.runStats as NonNullable<ActivityItem['runStats']>).distance, 0), unitSystem, 1),
      unit: dUnit,
    },
    avg_pace: avgPaceSecPerKm ? { value: fmtPaceFromSecPerKm(avgPaceSecPerKm, unitSystem), unit: `/${dUnit}` } : NONE,
    runs_monthly: { value: String(runs.filter((a) => a.date >= monthStart).length), unit: 'this mo' },
    longest_run: longest > 0 ? { value: distanceValueOnly(longest, unitSystem, 1), unit: dUnit } : NONE,
    elevation: hasElevation
      ? { value: String(Math.round(unitSystem === 'imperial' ? climbM * 3.28084 : climbM)), unit: `${unitSystem === 'imperial' ? 'ft' : 'm'} this wk` }
      : NONE,
    fastest_5k: fastest5k?.earned && fastest5k.sub ? { value: fastest5k.sub, unit: '' } : NONE,
    run_streak: { value: String(runStreak), unit: runStreak === 1 ? 'day' : 'days' },
  };

  return { home, strength, running };
}

/* ---------------- Account tab ---------------- */

export interface AccountStats {
  activitiesLogged: number;
  totalRunKm: number;
  dayStreak: number;
}

export function computeAccountStats(input: StatsInput): AccountStats {
  const runs = runsOf(input.activities);
  return {
    activitiesLogged: input.activities.length,
    totalRunKm: runs.reduce((n, a) => n + (a.runStats as NonNullable<ActivityItem['runStats']>).distance, 0),
    dayStreak: streaks(activeDaySet(input.activities), input.now).current,
  };
}
