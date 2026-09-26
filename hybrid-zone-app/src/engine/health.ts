// Read-only bridge to the phone's health store: Apple Health (HealthKit) on
// iOS, Health Connect on Android. Both native libraries are required lazily,
// inside the functions that use them — same reason as Google Sign-In in
// authStore.ts: they touch native modules that only exist in a dev/production
// build, so importing them eagerly would crash anywhere else (Expo Go, web).
//
// What arrives here is whatever other apps and devices have written into the
// health store. An Apple Watch does that by itself; other wearables only
// appear if their own app is set to share with Apple Health / Health Connect.
import { Platform } from 'react-native';
import { dayKey, startOfDay, startOfWeekMonday } from './dates';

export interface HealthSnapshot {
  steps: number | null; // today so far
  activeCalories: number | null; // kcal burned through activity, today so far
  sleepMinutes: number | null; // asleep time in the most recent night
  weekSteps: number | null; // Monday until now
  weekActiveCalories: number | null; // Monday until now
  avgSleepMinutes: number | null; // average night over the last 7 days
  restingHeartRate: number | null; // bpm: average of the last 7 days' resting estimates
  heartRateBars: number[] | null; // 7 bar heights (0-100), one per day, of that resting estimate
  updatedAt: number; // ms epoch
}

export const healthSourceName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
export const isHealthPlatformSupported = Platform.OS === 'ios' || Platform.OS === 'android';

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');
type HealthConnectModule = typeof import('react-native-health-connect');

function healthKit(): HealthKitModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@kingstinct/react-native-healthkit');
}
function healthConnect(): HealthConnectModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-health-connect');
}

// HealthKit crashes the app natively if you read a type you never requested
// access to, so this list is the single source for both the request and the
// reads below — add a type here before querying it anywhere.
const IOS_READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate', // written directly by Apple Watch, WHOOP and Fitbit/Google Health
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

// Bump when a type is added above: the connected app re-asks once so the new
// type is covered (iOS only shows the sheet for types it hasn't asked about yet).
export const HEALTH_PERMISSION_VERSION = '2';

const HC_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
] as const;

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const WEEK_DAYS = 7;

function startOfToday(): Date {
  return new Date(startOfDay(Date.now()));
}

// The window "last night's sleep" is looked for in: from 6pm yesterday until
// now, so a sleep that ended this morning is caught but an older one isn't.
function sleepWindowStart(): Date {
  const d = startOfToday();
  d.setTime(d.getTime() - 6 * HOUR);
  return d;
}

type Span = { start: number; end: number };

// Watch + phone (or two apps) often report the same night twice — summing the
// raw samples would double it, so merge overlapping spans first.
function unionMinutes(spans: Span[]): number {
  const sorted = [...spans].filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const s of sorted) {
    if (curEnd < 0 || s.start > curEnd) {
      if (curEnd >= 0) total += curEnd - curStart;
      curStart = s.start;
      curEnd = s.end;
    } else if (s.end > curEnd) {
      curEnd = s.end;
    }
  }
  if (curEnd >= 0) total += curEnd - curStart;
  return Math.round(total / 60000);
}

// Average time asleep per night. Each span belongs to the day it ended on (the
// morning you woke up); days with under two hours are ignored so a stray nap
// or a night the watch wasn't worn doesn't drag the average down.
function averageNightMinutes(spans: Span[]): number | null {
  const byDay = new Map<string, Span[]>();
  for (const s of spans) {
    const key = dayKey(s.end);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const nights = [...byDay.values()].map(unionMinutes).filter((m) => m >= 120);
  return nights.length ? Math.round(nights.reduce((a, b) => a + b, 0) / nights.length) : null;
}

// A day's resting heart rate, estimated as the average of its three quietest
// hours (mostly asleep or sitting still). A plain 24-hour average is dragged up
// by every walk, workout and coffee, so it says little about fitness. Returns
// one entry per day for the last `days` days, oldest first; null where there
// were fewer than three hours of readings.
function restingByDay(points: { t: number; bpm: number }[], days: number, now: number): (number | null)[] {
  const hours = new Map<number, { sum: number; n: number }>();
  for (const p of points) {
    const h = Math.floor(p.t / HOUR);
    const e = hours.get(h) ?? { sum: 0, n: 0 };
    e.sum += p.bpm;
    e.n += 1;
    hours.set(h, e);
  }
  const today = startOfDay(now);
  const perDay: number[][] = Array.from({ length: days }, () => []);
  hours.forEach((e, h) => {
    const daysAgo = Math.round((today - startOfDay(h * HOUR)) / DAY);
    const i = days - 1 - daysAgo;
    if (i >= 0 && i < days) perDay[i].push(e.sum / e.n);
  });
  return perDay.map((vals) => {
    if (vals.length < 3) return null;
    const quiet = [...vals].sort((a, b) => a - b).slice(0, 3);
    return Math.round(quiet.reduce((a, b) => a + b, 0) / 3);
  });
}

// Prefer a device-reported resting value for a day, else the estimate.
function mergeResting(reported: (number | null)[] | null, estimated: (number | null)[] | null): (number | null)[] | null {
  if (!reported && !estimated) return null;
  return Array.from({ length: WEEK_DAYS }, (_, i) => reported?.[i] ?? estimated?.[i] ?? null);
}

// Weekly headline number plus per-day bar heights for the Home tile. Null when
// there isn't enough data for a trend to mean anything.
function summarizeResting(perDay: (number | null)[]): { value: number; bars: number[] } | null {
  const present = perDay.filter((v): v is number => v !== null);
  if (present.length < 2) return null;
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = Math.max(1, max - min);
  return {
    value: Math.round(present.reduce((a, b) => a + b, 0) / present.length),
    bars: perDay.map((v) => (v === null ? 8 : Math.round(30 + ((v - min) / range) * 70))),
  };
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

async function safe<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null; // one metric failing (no data / not permitted) shouldn't sink the rest
  }
}

/* ---------------- availability + permission ---------------- */

export async function isHealthAvailable(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') return await healthKit().isHealthDataAvailableAsync();
    if (Platform.OS === 'android') {
      const hc = healthConnect();
      return (await hc.getSdkStatus()) === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    }
  } catch {
    // native module missing (e.g. Expo Go) — treat as unavailable
  }
  return false;
}

// iOS never says whether read access was granted or denied (Apple hides it so
// apps can't infer health conditions), so `true` here only means the prompt
// completed; a denial just shows up later as empty data.
export async function requestHealthAccess(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return await healthKit().requestAuthorization({ toRead: IOS_READ_TYPES });
  }
  if (Platform.OS === 'android') {
    const hc = healthConnect();
    await hc.initialize();
    const granted = await hc.requestPermission([...HC_PERMISSIONS]);
    return granted.length > 0;
  }
  return false;
}

/* ---------------- reading ---------------- */

type SnapshotData = Omit<HealthSnapshot, 'updatedAt'>;

function finishSnapshot(parts: Omit<SnapshotData, 'restingHeartRate' | 'heartRateBars'>, resting: (number | null)[] | null): SnapshotData {
  const summary = resting ? summarizeResting(resting) : null;
  return { ...parts, restingHeartRate: summary?.value ?? null, heartRateBars: summary?.bars ?? null };
}

async function readIos(): Promise<SnapshotData> {
  const hk = healthKit();
  const now = new Date();
  const dayFilter = { date: { startDate: startOfToday(), endDate: now } };
  const weekFilter = { date: { startDate: new Date(startOfWeekMonday(now.getTime())), endDate: now } };

  const sum = (id: 'HKQuantityTypeIdentifierStepCount' | 'HKQuantityTypeIdentifierActiveEnergyBurned', unit: 'count' | 'kcal', filter: typeof dayFilter) =>
    safe(async () => {
      const r = await hk.queryStatisticsForQuantity(id, ['cumulativeSum'], { filter, unit } as never);
      return r.sumQuantity?.quantity ?? null;
    });
  const steps = await sum('HKQuantityTypeIdentifierStepCount', 'count', dayFilter);
  const activeCalories = await sum('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', dayFilter);
  const weekSteps = await sum('HKQuantityTypeIdentifierStepCount', 'count', weekFilter);
  const weekCalories = await sum('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', weekFilter);

  // Hourly average heart rate over the last 7 days (one cheap query rather than
  // pulling every sample), reduced to a resting estimate per day.
  const hrFrom = new Date(startOfToday().getTime() - (WEEK_DAYS - 1) * DAY);
  const hourly = await safe(async () => {
    const rows = await hk.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierHeartRate', ['discreteAverage'], hrFrom, { hour: 1 }, {
      filter: { date: { startDate: hrFrom, endDate: now } },
      unit: 'count/min',
    });
    return rows.flatMap((r) => (r.startDate && r.averageQuantity ? [{ t: r.startDate.getTime(), bpm: r.averageQuantity.quantity }] : []));
  });

  // Devices that measure resting heart rate themselves (Apple Watch, WHOOP,
  // Fitbit via Google Health) write it as its own value, which beats estimating
  // it from raw readings. Sparse writers like WHOOP send too few raw readings
  // for the estimate to work at all.
  const restingDaily = await safe(async () => {
    const rows = await hk.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierRestingHeartRate', ['discreteAverage'], hrFrom, { day: 1 }, {
      filter: { date: { startDate: hrFrom, endDate: now } },
      unit: 'count/min',
    });
    const out: (number | null)[] = new Array(WEEK_DAYS).fill(null);
    rows.forEach((r) => {
      if (!r.startDate || !r.averageQuantity) return;
      const i = Math.round((startOfDay(r.startDate.getTime()) - hrFrom.getTime()) / DAY);
      if (i >= 0 && i < WEEK_DAYS) out[i] = Math.round(r.averageQuantity.quantity);
    });
    return out;
  });

  // Sleep: last night, plus every night this week for the average.
  const sleepSpans = await safe(async () => {
    const samples = await hk.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: -1,
      ascending: true,
      filter: { date: { startDate: new Date(sleepWindowStart().getTime() - (WEEK_DAYS - 1) * DAY), endDate: now } },
    });
    // Asleep values only (unspecified/core/deep/REM); skip "in bed" and "awake".
    const asleep = new Set<number>([
      hk.CategoryValueSleepAnalysis.asleepUnspecified,
      hk.CategoryValueSleepAnalysis.asleepCore,
      hk.CategoryValueSleepAnalysis.asleepDeep,
      hk.CategoryValueSleepAnalysis.asleepREM,
    ]);
    return samples.filter((s) => asleep.has(Number(s.value))).map((s) => ({ start: s.startDate.getTime(), end: s.endDate.getTime() }));
  });
  const lastNight = sleepSpans ? unionMinutes(sleepSpans.filter((s) => s.end >= sleepWindowStart().getTime())) : 0;

  return finishSnapshot(
    {
      steps: steps !== null ? Math.round(steps) : null,
      activeCalories: activeCalories !== null ? Math.round(activeCalories) : null,
      sleepMinutes: lastNight > 0 ? lastNight : null,
      weekSteps: weekSteps !== null ? Math.round(weekSteps) : null,
      weekActiveCalories: weekCalories !== null ? Math.round(weekCalories) : null,
      avgSleepMinutes: sleepSpans ? averageNightMinutes(sleepSpans) : null,
    },
    mergeResting(restingDaily, hourly ? restingByDay(hourly, WEEK_DAYS, now.getTime()) : null),
  );
}

async function readAndroid(): Promise<SnapshotData> {
  const hc = healthConnect();
  await hc.initialize();
  const now = new Date();
  const range = (from: number) => ({ operator: 'between' as const, startTime: new Date(from).toISOString(), endTime: now.toISOString() });
  const today = range(startOfToday().getTime());
  const week = range(startOfWeekMonday(now.getTime()));

  const steps = await safe(async () => (await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: today })).COUNT_TOTAL);
  const activeCalories = await safe(async () => (await hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: today })).ACTIVE_CALORIES_TOTAL.inKilocalories);
  const weekSteps = await safe(async () => (await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: week })).COUNT_TOTAL);
  const weekCalories = await safe(async () => (await hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: week })).ACTIVE_CALORIES_TOTAL.inKilocalories);

  const hrFrom = startOfToday().getTime() - (WEEK_DAYS - 1) * DAY;
  const hr = await safe(async () => {
    const { records } = await hc.readRecords('HeartRate', { timeRangeFilter: range(hrFrom), ascendingOrder: true });
    return records.flatMap((r) => r.samples.map((s) => ({ t: new Date(s.time).getTime(), bpm: s.beatsPerMinute })));
  });

  const sleepSpans = await safe(async () => {
    const { records } = await hc.readRecords('SleepSession', { timeRangeFilter: range(sleepWindowStart().getTime() - (WEEK_DAYS - 1) * DAY), ascendingOrder: true });
    return records.map((r) => ({ start: new Date(r.startTime).getTime(), end: new Date(r.endTime).getTime() }));
  });
  const lastNight = sleepSpans ? unionMinutes(sleepSpans.filter((s) => s.end >= sleepWindowStart().getTime())) : 0;

  return finishSnapshot(
    {
      steps: steps !== null ? Math.round(steps) : null,
      activeCalories: activeCalories !== null ? Math.round(activeCalories) : null,
      sleepMinutes: lastNight > 0 ? lastNight : null,
      weekSteps: weekSteps !== null ? Math.round(weekSteps) : null,
      weekActiveCalories: weekCalories !== null ? Math.round(weekCalories) : null,
      avgSleepMinutes: sleepSpans ? averageNightMinutes(sleepSpans) : null,
    },
    hr ? restingByDay(hr, WEEK_DAYS, now.getTime()) : null,
  );
}

export async function readHealthSnapshot(): Promise<HealthSnapshot> {
  const data = Platform.OS === 'ios' ? await readIos() : await readAndroid();
  return { ...data, updatedAt: Date.now() };
}

/* ---------------- one workout's window ---------------- */

export interface WorkoutHealthStats {
  steps: number | null;
  activeCalories: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  heartRate: number[] | null; // bpm across the workout, evenly spaced, for the chart
}

const HR_CHART_POINTS = 32;

// Buckets heart-rate points across [from, to] into evenly spaced averages,
// carrying the previous value over empty buckets. Null when there are too few
// readings for a chart to mean anything.
function heartRateSeries(points: { t: number; bpm: number }[], from: number, to: number): number[] | null {
  if (points.length < 3 || to <= from) return null;
  const slice = (to - from) / HR_CHART_POINTS;
  const sums = new Array<number>(HR_CHART_POINTS).fill(0);
  const counts = new Array<number>(HR_CHART_POINTS).fill(0);
  for (const p of points) {
    const i = Math.min(HR_CHART_POINTS - 1, Math.max(0, Math.floor((p.t - from) / slice)));
    sums[i] += p.bpm;
    counts[i] += 1;
  }
  const out: number[] = [];
  let last: number | null = null;
  for (let i = 0; i < HR_CHART_POINTS; i++) {
    if (counts[i]) last = sums[i] / counts[i];
    out.push(last ?? 0);
  }
  const firstReal = out.find((v) => v > 0) ?? 0;
  return out.map((v) => Math.round(v > 0 ? v : firstReal));
}

function summarizeHeartRate(points: { t: number; bpm: number }[] | null, from: number, to: number) {
  if (!points || !points.length) return { avg: null, max: null, series: null };
  return {
    avg: average(points.map((p) => p.bpm)),
    max: Math.round(Math.max(...points.map((p) => p.bpm))),
    series: heartRateSeries(points, from, to),
  };
}

// Steps, energy and heart rate recorded between `startMs` and `endMs` — for the
// summary shown when a run or workout finishes. Needs the same read access the
// Home tiles use; anything the health app has no data for comes back null.
export async function readWorkoutHealthStats(startMs: number, endMs: number): Promise<WorkoutHealthStats> {
  // A watch syncs a little after the fact, so pad the end slightly.
  const from = startMs;
  const to = endMs + 60_000;

  if (Platform.OS === 'ios') {
    const hk = healthKit();
    const filter = { date: { startDate: new Date(from), endDate: new Date(to) } };
    const steps = await safe(async () => {
      const r = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' });
      return r.sumQuantity?.quantity ?? null;
    });
    const energy = await safe(async () => {
      const r = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' });
      return r.sumQuantity?.quantity ?? null;
    });
    const hr = await safe(async () => {
      const samples = await hk.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', { limit: 2000, ascending: true, unit: 'count/min', filter });
      return samples.map((s) => ({ t: s.startDate.getTime(), bpm: s.quantity }));
    });
    const h = summarizeHeartRate(hr, from, to);
    return {
      steps: steps !== null && steps > 0 ? Math.round(steps) : null,
      activeCalories: energy !== null && energy > 0 ? Math.round(energy) : null,
      avgHeartRate: h.avg,
      maxHeartRate: h.max,
      heartRate: h.series,
    };
  }

  if (Platform.OS === 'android') {
    const hc = healthConnect();
    await safe(() => hc.initialize());
    const range = { operator: 'between' as const, startTime: new Date(from).toISOString(), endTime: new Date(to).toISOString() };
    const steps = await safe(async () => (await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range })).COUNT_TOTAL);
    const energy = await safe(async () => (await hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range })).ACTIVE_CALORIES_TOTAL.inKilocalories);
    const hr = await safe(async () => {
      const { records } = await hc.readRecords('HeartRate', { timeRangeFilter: range, ascendingOrder: true });
      return records.flatMap((r) => r.samples.map((s) => ({ t: new Date(s.time).getTime(), bpm: s.beatsPerMinute })));
    });
    const h = summarizeHeartRate(hr, from, to);
    return {
      steps: steps !== null && steps > 0 ? Math.round(steps) : null,
      activeCalories: energy !== null && energy > 0 ? Math.round(energy) : null,
      avgHeartRate: h.avg,
      maxHeartRate: h.max,
      heartRate: h.series,
    };
  }

  return { steps: null, activeCalories: null, avgHeartRate: null, maxHeartRate: null, heartRate: null };
}
