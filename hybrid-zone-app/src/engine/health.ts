// Read-only bridge to the phone's health store: Apple Health (HealthKit) on
// iOS, Health Connect on Android. Both native libraries are required lazily,
// inside the functions that use them — same reason as Google Sign-In in
// authStore.ts: they touch native modules that only exist in a dev/production
// build, so importing them eagerly would crash anywhere else (Expo Go, web).
import { Platform } from 'react-native';

export interface HealthSnapshot {
  steps: number | null; // today so far
  activeCalories: number | null; // kcal burned through activity, today so far
  sleepMinutes: number | null; // asleep time in the most recent night
  avgHeartRate: number | null; // bpm, average of the last 24h
  heartRateBars: number[] | null; // 7 bar heights (0-100) for the Home heart-rate tile
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
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

const HC_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
] as const;

const HOUR = 3600 * 1000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// The window "last night's sleep" is looked for in: from 6pm yesterday until
// now, so a sleep that ended this morning is caught but an older one isn't.
function sleepWindowStart(): Date {
  const d = startOfToday();
  d.setTime(d.getTime() - 6 * HOUR);
  return d;
}

// Watch + phone (or two apps) often report the same night twice — summing the
// raw samples would double it, so merge overlapping spans first.
function unionMinutes(spans: { start: number; end: number }[]): number {
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

// Averages heart-rate points into 7 equal time slices across the window and
// scales them to bar heights. Returns null when there isn't enough data for
// the shape to mean anything.
function heartRateBars(points: { t: number; bpm: number }[], from: number, to: number): number[] | null {
  if (points.length < 7) return null;
  const slice = (to - from) / 7;
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const p of points) {
    const i = Math.min(6, Math.max(0, Math.floor((p.t - from) / slice)));
    sums[i] += p.bpm;
    counts[i] += 1;
  }
  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : null));
  const present = avgs.filter((a): a is number => a !== null);
  if (present.length < 4) return null;
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = Math.max(1, max - min);
  return avgs.map((a) => (a === null ? 8 : Math.round(20 + ((a - min) / range) * 80)));
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

async function readIos(): Promise<Omit<HealthSnapshot, 'updatedAt'>> {
  const hk = healthKit();
  const now = new Date();
  const dayFilter = { date: { startDate: startOfToday(), endDate: now } };

  const steps = await safe(async () => {
    const r = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter: dayFilter, unit: 'count' });
    return r.sumQuantity?.quantity ?? null;
  });
  const activeCalories = await safe(async () => {
    const r = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter: dayFilter, unit: 'kcal' });
    return r.sumQuantity?.quantity ?? null;
  });

  const hrFrom = now.getTime() - 24 * HOUR;
  const hr = await safe(async () => {
    const samples = await hk.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      limit: 1000,
      ascending: true,
      unit: 'count/min',
      filter: { date: { startDate: new Date(hrFrom), endDate: now } },
    });
    return samples.map((s) => ({ t: s.startDate.getTime(), bpm: s.quantity }));
  });

  const sleepMinutes = await safe(async () => {
    const samples = await hk.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: -1,
      ascending: true,
      filter: { date: { startDate: sleepWindowStart(), endDate: now } },
    });
    // Asleep values only (unspecified/core/deep/REM); skip "in bed" and "awake".
    const asleep = new Set<number>([
      hk.CategoryValueSleepAnalysis.asleepUnspecified,
      hk.CategoryValueSleepAnalysis.asleepCore,
      hk.CategoryValueSleepAnalysis.asleepDeep,
      hk.CategoryValueSleepAnalysis.asleepREM,
    ]);
    const mins = unionMinutes(samples.filter((s) => asleep.has(Number(s.value))).map((s) => ({ start: s.startDate.getTime(), end: s.endDate.getTime() })));
    return mins > 0 ? mins : null;
  });

  return {
    steps: steps !== null ? Math.round(steps) : null,
    activeCalories: activeCalories !== null ? Math.round(activeCalories) : null,
    sleepMinutes,
    avgHeartRate: hr ? average(hr.map((p) => p.bpm)) : null,
    heartRateBars: hr ? heartRateBars(hr, hrFrom, now.getTime()) : null,
  };
}

async function readAndroid(): Promise<Omit<HealthSnapshot, 'updatedAt'>> {
  const hc = healthConnect();
  await hc.initialize();
  const now = new Date();
  const today = { operator: 'between' as const, startTime: startOfToday().toISOString(), endTime: now.toISOString() };

  const steps = await safe(async () => (await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: today })).COUNT_TOTAL);
  const activeCalories = await safe(async () => (await hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: today })).ACTIVE_CALORIES_TOTAL.inKilocalories);

  const hrFrom = now.getTime() - 24 * HOUR;
  const hr = await safe(async () => {
    const { records } = await hc.readRecords('HeartRate', {
      timeRangeFilter: { operator: 'between', startTime: new Date(hrFrom).toISOString(), endTime: now.toISOString() },
      ascendingOrder: true,
    });
    return records.flatMap((r) => r.samples.map((s) => ({ t: new Date(s.time).getTime(), bpm: s.beatsPerMinute })));
  });

  const sleepMinutes = await safe(async () => {
    const { records } = await hc.readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', startTime: sleepWindowStart().toISOString(), endTime: now.toISOString() },
      ascendingOrder: true,
    });
    const mins = unionMinutes(records.map((r) => ({ start: new Date(r.startTime).getTime(), end: new Date(r.endTime).getTime() })));
    return mins > 0 ? mins : null;
  });

  return {
    steps: steps !== null ? Math.round(steps) : null,
    activeCalories: activeCalories !== null ? Math.round(activeCalories) : null,
    sleepMinutes,
    avgHeartRate: hr ? average(hr.map((p) => p.bpm)) : null,
    heartRateBars: hr ? heartRateBars(hr, hrFrom, now.getTime()) : null,
  };
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
