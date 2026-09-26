// Tracker store — all the tracker screens' state and actions. Everything the
// app shows about the user's history (activities, stats, records) is derived
// from `workoutLogs` and `cardio`, which come from the account (see
// hydrateFromBackend) — there is no built-in sample data.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { DayLabel } from '@/engine/calendar';
import { getTodayShort, DAY_LABELS, DAY_FULL_MAP, FULL_TO_DAY_LABEL, isViewingToday as calendarIsViewingToday } from '@/engine/calendar';
import { saveWorkoutLog, getWorkoutLogs, deleteWorkoutLog, type WorkoutLogResponse } from '@/api/workoutLogs';
import { lastLoggedWeight } from '@/engine/exerciseHistory';
import { weightStepFor, weightToKg, fmtDistance, distanceToKm, type UnitSystem } from '@/engine/units';
import { haversineDistanceKm, isPlausibleMovement, RoutePoint } from '@/engine/gps';
import { startRunTracking, stopRunTracking } from '@/engine/locationTask';
import { getProgram, saveProgram, type ProgramPayload } from '@/api/program';
import { getPreferences, savePreferences, type AppSettings } from '@/api/preferences';
import { getRunActivities, saveRunActivity, deleteRunActivity, type RunActivityResponse } from '@/api/runActivities';
import { saveCustomExercise } from '@/api/customExercises';
import { EXERCISE_POOL, MuscleGroupKey, deriveMuscleGroups } from '@/engine/exerciseLibrary';
import {
  ActivityItem,
  ActivityType,
  CardioRecord,
  RunSessionPlan,
  Session,
  SessionExercise,
  SessionKey,
  WorkoutLogRecord,
  WorkoutSummaryData,
  groupSetsByExercise,
} from '@/engine/records';
import { StatsInput, computeDataHighlights } from '@/engine/stats';
import { activityDaysAgo } from '@/engine/records';
import { buildRunPlans } from '@/engine/programBuilder';
import { useHealthStore } from '@/store/healthStore';

export { EXERCISE_POOL };
export type { ActivityItem, ActivityType, MuscleGroupKey, RunSessionPlan, Session, SessionExercise, SessionKey, CardioRecord, WorkoutLogRecord };
export type { BadgeItem } from '@/engine/achievements';

/* ---------------- TYPES ---------------- */

export type PresetSessionKey = 'Push' | 'Pull' | 'Legs' | 'Upper';
export type MetricContext = 'home' | 'strength' | 'running';
export type RunStatus = 'idle' | 'countdown' | 'running' | 'paused';
export type RunType = 'open' | 'distance' | 'interval';

export interface SetEntry {
  num: number;
  weight: number;
  reps: number;
  done?: boolean; // checked off: locked in, and the only sets a finished workout saves
}

// A tile's definition — its numbers are computed live (engine/stats.ts), so
// nothing here carries a value.
export interface OverviewMetric {
  id: string;
  label: string;
  icon: string;
  big?: boolean;
}

export interface ProgramEditState {
  splitKey: string; // a SPLIT_TEMPLATES key, or 'custom'
  dayAssignments: Partial<Record<string, DayLabel>>; // session name -> day
  runDays: DayLabel[];
  customSessions: Record<string, { exercises: SessionExercise[] }>;
  newSessionNameInput: string;
}

/* ---------------- STATIC DATA ---------------- */

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Writes to the program are held back until the account's program has been
// loaded at least once (or the user has just built one) — otherwise a failed
// initial load followed by any edit would overwrite their real program on the
// server with an empty one.
let programSyncEnabled = false;
export function enableProgramSync(): void {
  programSyncEnabled = true;
}
export function disableProgramSync(): void {
  programSyncEnabled = false;
}

// Fire-and-forget sync of the whole program (backend owns a full-replace PUT
// model) — called after any action that mutates `sessions`/`runSessions` so a
// relaunch or reinstall can restore the user's program from their account.
function persistProgram(
  sessions: Record<SessionKey, Session>,
  runSessions: Partial<Record<DayLabel, RunSessionPlan>>,
  split: string = 'custom',
  force = false,
): void {
  if (!programSyncEnabled && !force) return;
  const payload: ProgramPayload = {
    split,
    sessions: Object.keys(sessions).map((key) => ({
      key,
      day: sessions[key].day,
      duration: sessions[key].duration,
      exercises: sessions[key].exercises.map((ex) => ({ name: ex.name, group: ex.group, sets: ex.sets, previous: ex.previous ?? null })),
    })),
    runDays: (Object.keys(runSessions) as DayLabel[]).map((day) => {
      const rd = runSessions[day] as RunSessionPlan;
      return { day, type: rd.type, distance: rd.distance, duration: rd.duration, pace: rd.pace, zoneTag: rd.zoneTag, zoneDetail: rd.zoneDetail, effort: rd.effort };
    }),
  };
  saveProgram(payload)
    .then(() => {
      programSyncEnabled = true;
    })
    .catch(() => {});
}

// Per-account settings (units, rest timer, run defaults) follow the user to a
// new device; a failed save just means this device keeps the value locally.
function persistSettings(settings: AppSettings): void {
  savePreferences({ settings }).catch(() => {});
}

/* ---------------- activities, built from the account's real records ---------------- */

const ACTIVITY_TYPES: ActivityType[] = ['strength', 'running', 'cycling', 'swimming', 'walking', 'other'];

function normalizeActivityType(raw: string): ActivityType {
  return (ACTIVITY_TYPES as string[]).includes(raw) ? (raw as ActivityType) : 'other';
}

const DEFAULT_ACTIVITY_TITLE: Record<ActivityType, string> = {
  strength: 'Strength Workout',
  running: 'Outdoor Run',
  cycling: 'Cycling Session',
  swimming: 'Swim Session',
  walking: 'Walk',
  other: 'Activity',
};

function cardioFromResponse(r: RunActivityResponse): CardioRecord {
  const type = normalizeActivityType(r.type);
  return {
    id: r.id,
    type,
    title: r.title?.trim() || DEFAULT_ACTIVITY_TITLE[type],
    date: new Date(r.date ?? Date.now()).getTime(),
    distanceKm: r.distance,
    durationMin: Number(r.duration) || 0,
    route: r.route ?? undefined,
  };
}

function workoutLogFromResponse(r: WorkoutLogResponse): WorkoutLogRecord {
  return {
    id: r.id,
    sessionKey: r.sessionKey,
    date: new Date(r.date).getTime(),
    durationSec: r.durationSec ?? null,
    sets: r.loggedSets.map((s) => ({ exerciseName: s.exerciseName, reps: s.reps, weight: s.weight })),
  };
}

function activityFromCardio(c: CardioRecord): ActivityItem {
  if (c.type === 'running') {
    const avgSpeed = c.durationMin > 0 ? c.distanceKm / (c.durationMin / 60) : 0;
    const maxSpeed = (c.route ?? []).reduce((max, point, i, route) => {
      if (i === 0) return max;
      const prev = route[i - 1];
      const dtHours = (point.timestamp - prev.timestamp) / 1000 / 3600;
      if (dtHours <= 0) return max;
      return Math.max(max, haversineDistanceKm(prev, point) / dtHours);
    }, avgSpeed);
    return {
      type: 'running',
      title: c.title,
      date: c.date,
      runStats: {
        distance: c.distanceKm,
        duration: c.durationMin,
        // Estimate (~65 kcal per km) — there's no weight/heart-rate input to do better.
        calories: Math.round(c.distanceKm * 65),
        avgSpeed,
        maxSpeed,
        route: c.route,
      },
    };
  }
  return { type: c.type, title: c.title, date: c.date, otherStats: { duration: Math.round(c.durationMin), distance: c.distanceKm > 0 ? c.distanceKm : null } };
}

function activityFromLog(log: WorkoutLogRecord): ActivityItem {
  const byExercise = new Map<string, { weight: number; reps: number }[]>();
  log.sets.forEach((s) => {
    const list = byExercise.get(s.exerciseName) ?? [];
    list.push({ weight: s.weight, reps: s.reps });
    byExercise.set(s.exerciseName, list);
  });
  return {
    type: 'strength',
    title: `${log.sessionKey} Workout`,
    date: log.date,
    strengthStats: {
      duration: log.durationSec != null ? Math.max(1, Math.round(log.durationSec / 60)) : null,
      exercises: [...byExercise.entries()].map(([name, sets]) => ({ name, sets })),
    },
  };
}

function buildActivities(logs: WorkoutLogRecord[], cardio: CardioRecord[]): ActivityItem[] {
  return [...logs.map(activityFromLog), ...cardio.map(activityFromCardio)].sort((a, b) => b.date - a.date);
}

// Sessions' "previous" weight = what the user last lifted for that exercise.
function withPreviousWeights(sessions: Record<SessionKey, Session>, logs: WorkoutLogRecord[]): Record<SessionKey, Session> {
  const next: Record<SessionKey, Session> = {};
  Object.keys(sessions).forEach((key) => {
    next[key] = { ...sessions[key], exercises: sessions[key].exercises.map((ex) => ({ ...ex, previous: lastLoggedWeight(ex.name, logs) ?? ex.previous })) };
  });
  return next;
}

export interface SplitTemplate {
  name: string;
  sessions: Record<string, Omit<Session, 'day'>>;
}

function tmpl(duration: number, exercises: SessionExercise[]): Omit<Session, 'day'> {
  return { duration, muscleGroups: deriveMuscleGroups(exercises), exercises };
}

function mkEx(id: string, name: string, group: MuscleGroupKey, sets: number): SessionExercise {
  return { id, name, group, sets, previous: null };
}

// Program Editor's split picker. ppl_upper's session data mirrors
// INITIAL_SESSIONS exactly (minus `day`, which the editor assigns).
export const SPLIT_TEMPLATES: Record<string, SplitTemplate> = {
  ppl_upper: {
    name: 'Push / Pull / Legs / Upper',
    sessions: {
      Push: tmpl(60, [mkEx('pplP1', 'Incline DB Press', 'Chest', 3), mkEx('pplP2', 'Shoulder Press', 'Shoulders', 3), mkEx('pplP3', 'Pec Deck Fly', 'Chest', 3), mkEx('pplP4', 'Lateral Raises', 'Shoulders', 3), mkEx('pplP5', 'Dips', 'Arms', 3)]),
      Pull: tmpl(55, [mkEx('pplL1', 'Lat Pulldown', 'Back', 3), mkEx('pplL2', 'T-Bar Row', 'Back', 3), mkEx('pplL3', 'Seated Cable Row', 'Back', 3), mkEx('pplL4', 'Preacher Curl', 'Arms', 3), mkEx('pplL5', 'Cable Hammer Curl', 'Arms', 3)]),
      Legs: tmpl(55, [mkEx('pplG1', 'RDL', 'Legs', 3), mkEx('pplG2', 'Leg Press', 'Legs', 3), mkEx('pplG3', 'Leg Curl', 'Legs', 3), mkEx('pplG4', 'Leg Extension', 'Legs', 3), mkEx('pplG5', 'Calf Raises', 'Legs', 3)]),
      Upper: tmpl(65, [mkEx('pplU1', 'Incline DB Press', 'Chest', 3), mkEx('pplU2', 'Lat Pulldown', 'Back', 3), mkEx('pplU3', 'Shoulder Press', 'Shoulders', 3), mkEx('pplU4', 'Seated Cable Row', 'Back', 3), mkEx('pplU5', 'Lateral Raises', 'Shoulders', 3), mkEx('pplU6', 'Preacher Curl', 'Arms', 3), mkEx('pplU7', 'Dips', 'Arms', 3)]),
    },
  },
  upper_lower: {
    name: 'Upper / Lower (×2)',
    sessions: {
      'Upper A': {
        duration: 55,
        muscleGroups: [{ name: 'Chest', current: 5, max: 18 }, { name: 'Back', current: 5, max: 18 }, { name: 'Shoulders', current: 4, max: 18 }, { name: 'Arms', current: 4, max: 18 }],
        exercises: [mkEx('ulA1', 'Barbell Bench Press', 'Chest', 3), mkEx('ulA2', 'Lat Pulldown', 'Back', 3), mkEx('ulA3', 'Shoulder Press', 'Shoulders', 3), mkEx('ulA4', 'DB Curl', 'Arms', 3), mkEx('ulA5', 'Cable Tricep Pushdown', 'Arms', 3)],
      },
      'Lower A': {
        duration: 55,
        muscleGroups: [{ name: 'Legs', current: 8, max: 20 }],
        exercises: [mkEx('llA1', 'Barbell Back Squat', 'Legs', 3), mkEx('llA2', 'RDL', 'Legs', 3), mkEx('llA3', 'Leg Press', 'Legs', 3), mkEx('llA4', 'Leg Curl', 'Legs', 3), mkEx('llA5', 'Calf Raises', 'Legs', 3)],
      },
      'Upper B': {
        duration: 55,
        muscleGroups: [{ name: 'Chest', current: 5, max: 18 }, { name: 'Back', current: 5, max: 18 }, { name: 'Shoulders', current: 4, max: 18 }, { name: 'Arms', current: 4, max: 18 }],
        exercises: [mkEx('ulB1', 'Incline DB Press', 'Chest', 3), mkEx('ulB2', 'T-Bar Row', 'Back', 3), mkEx('ulB3', 'Barbell Overhead Press', 'Shoulders', 3), mkEx('ulB4', 'Preacher Curl', 'Arms', 3), mkEx('ulB5', 'Skull Crushers', 'Arms', 3)],
      },
      'Lower B': {
        duration: 55,
        muscleGroups: [{ name: 'Legs', current: 7, max: 20 }, { name: 'Back', current: 3, max: 18 }],
        exercises: [mkEx('llB1', 'Squat', 'Legs', 3), mkEx('llB2', 'Deadlift', 'Back', 3), mkEx('llB3', 'Leg Extension', 'Legs', 3), mkEx('llB4', 'Seated Cable Row', 'Back', 3), mkEx('llB5', 'Lateral Raises', 'Shoulders', 3)],
      },
    },
  },
  full_body: {
    name: 'Full Body (×3)',
    sessions: {
      'Full Body A': {
        duration: 60,
        muscleGroups: [{ name: 'Chest', current: 4, max: 18 }, { name: 'Back', current: 4, max: 18 }, { name: 'Legs', current: 4, max: 20 }, { name: 'Shoulders', current: 3, max: 18 }, { name: 'Arms', current: 3, max: 18 }],
        exercises: [mkEx('fbA1', 'Barbell Bench Press', 'Chest', 3), mkEx('fbA2', 'Lat Pulldown', 'Back', 3), mkEx('fbA3', 'Barbell Back Squat', 'Legs', 3), mkEx('fbA4', 'Shoulder Press', 'Shoulders', 3), mkEx('fbA5', 'DB Curl', 'Arms', 3)],
      },
      'Full Body B': {
        duration: 60,
        muscleGroups: [{ name: 'Chest', current: 4, max: 18 }, { name: 'Back', current: 4, max: 18 }, { name: 'Legs', current: 4, max: 20 }, { name: 'Shoulders', current: 3, max: 18 }, { name: 'Arms', current: 3, max: 18 }],
        exercises: [mkEx('fbB1', 'Incline DB Press', 'Chest', 3), mkEx('fbB2', 'T-Bar Row', 'Back', 3), mkEx('fbB3', 'RDL', 'Legs', 3), mkEx('fbB4', 'Lateral Raises', 'Shoulders', 3), mkEx('fbB5', 'Cable Tricep Pushdown', 'Arms', 3)],
      },
      'Full Body C': {
        duration: 60,
        muscleGroups: [{ name: 'Chest', current: 4, max: 18 }, { name: 'Back', current: 4, max: 18 }, { name: 'Legs', current: 4, max: 20 }, { name: 'Shoulders', current: 3, max: 18 }, { name: 'Arms', current: 3, max: 18 }],
        exercises: [mkEx('fbC1', 'Pec Deck Fly', 'Chest', 3), mkEx('fbC2', 'Barbell Row', 'Back', 3), mkEx('fbC3', 'Leg Press', 'Legs', 3), mkEx('fbC4', 'Barbell Overhead Press', 'Shoulders', 3), mkEx('fbC5', 'Skull Crushers', 'Arms', 3)],
      },
    },
  },
};

export const OVERVIEW_METRICS: Record<MetricContext, OverviewMetric[]> = {
  home: [
    { id: 'burn', label: 'Weekly Burn', icon: 'burn' },
    { id: 'active', label: 'Active', icon: 'active' },
    { id: 'done', label: 'Done', icon: 'done' },
    { id: 'heartrate', label: 'Resting HR', icon: 'heartrate', big: true },
    { id: 'trend', label: 'Weekly Trend', icon: 'trend', big: true },
    { id: 'steps', label: 'Weekly Steps', icon: 'stepsIco' },
    { id: 'sleep', label: 'Avg Sleep', icon: 'sleep' },
    { id: 'workouts_month', label: 'Workouts', icon: 'done' },
    { id: 'longest_streak', label: 'Longest Streak', icon: 'flameIco' },
    { id: 'active_days', label: 'Active Days', icon: 'active' },
  ],
  strength: [
    { id: 'volume', label: 'Volume', icon: 'trend' },
    { id: 'logged', label: 'Logged Workouts', icon: 'done' },
    { id: 'done', label: 'Done', icon: 'done' }, // computed live from the viewed day's session
    { id: 'prs', label: 'PRs This Week', icon: 'trophyIco' },
    { id: 'total_sets', label: 'Total Sets', icon: 'layersIco' },
    { id: 'avg_duration', label: 'Avg Duration', icon: 'clock' },
    { id: 'workout_streak', label: 'Workout Streak', icon: 'flameIco' },
    { id: 'main_lift', label: 'Top Lift', icon: 'trendUp' },
    { id: 'muscle_groups', label: 'Muscle Groups', icon: 'layersIco' },
  ],
  running: [
    { id: 'steps_today', label: 'Steps Today', icon: 'stepsIco' },
    { id: 'weekly_dist', label: 'Weekly Dist.', icon: 'runIcoSm' },
    { id: 'avg_pace', label: 'Avg. Pace', icon: 'paceIco' },
    { id: 'runs_monthly', label: 'Runs Monthly', icon: 'monthIco' },
    { id: 'longest_run', label: 'Longest Run', icon: 'trendUp' },
    { id: 'elevation', label: 'Elevation', icon: 'elevation' },
    { id: 'fastest_5k', label: 'Fastest 5K', icon: 'trophyIco' },
    { id: 'run_streak', label: 'Run Streak', icon: 'flameIco' },
  ],
};

export const OVERVIEW_DEFAULTS: Record<MetricContext, Record<string, boolean>> = {
  home: { burn: true, active: true, done: true, heartrate: true, trend: true, steps: false, sleep: false, workouts_month: false, longest_streak: false, active_days: false },
  strength: { volume: true, logged: true, done: true, prs: false, total_sets: false, avg_duration: false, workout_streak: false, main_lift: false, muscle_groups: false },
  running: { steps_today: true, weekly_dist: true, avg_pace: true, runs_monthly: true, longest_run: false, elevation: false, fastest_5k: false, run_streak: false },
};

const METRIC_ORDER_KEY = 'hyvo.metricOrder';

// The tiles for one page in the person's chosen order. Anything not in the saved
// order (a tile added in a later version) goes after the ones that are.
export function sortedMetrics(context: MetricContext, order: string[]): OverviewMetric[] {
  const defs = OVERVIEW_METRICS[context];
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? order.length + defs.findIndex((d) => d.id === id) : i;
  };
  return [...defs].sort((a, b) => rank(a.id) - rank(b.id));
}

function defaultOrder(): Record<MetricContext, string[]> {
  return { home: OVERVIEW_METRICS.home.map((m) => m.id), strength: OVERVIEW_METRICS.strength.map((m) => m.id), running: OVERVIEW_METRICS.running.map((m) => m.id) };
}

function mergeMetricOrder(current: Record<MetricContext, string[]>, stored: Record<string, string[]>): Record<MetricContext, string[]> {
  const out = { ...current };
  (['home', 'strength', 'running'] as MetricContext[]).forEach((ctx) => {
    const saved = (stored[ctx] ?? []).filter((id) => OVERVIEW_METRICS[ctx].some((m) => m.id === id));
    out[ctx] = [...saved, ...current[ctx].filter((id) => !saved.includes(id))];
  });
  return out;
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  strength: 'strengthActivityIco',
  running: 'runIcoSm',
  cycling: 'cyclingIco',
  swimming: 'swimIco',
  walking: 'walkIco',
  other: 'otherIco',
};

export const LOGGABLE_ACTIVITY_TYPES: { id: ActivityType; label: string; defaultTitle: string; hasDistance: boolean }[] = [
  { id: 'cycling', label: 'Cycling', defaultTitle: 'Cycling Session', hasDistance: true },
  { id: 'swimming', label: 'Swimming', defaultTitle: 'Swim Session', hasDistance: true },
  { id: 'walking', label: 'Walking', defaultTitle: 'Walk', hasDistance: true },
  { id: 'other', label: 'Other', defaultTitle: 'Activity', hasDistance: false },
];

export const METRIC_INFO: Record<'goal' | 'consistency' | 'volume', { title: string; body: string }> = {
  goal: {
    title: 'Weekly Goal',
    body: "The average of your progress across this week's plan — strength sessions completed, runs completed and, when Apple Health or Health Connect is connected, steps toward 10,000 — each capped at 100% so overachieving one can't cover for missing another.",
  },
  consistency: {
    title: 'Consistency',
    body: 'Of the sessions your program schedules this week, how many you completed on the day they were scheduled. A workout done on a different day still counts toward your Weekly Goal, but not toward Consistency.',
  },
  volume: {
    title: 'Volume Trend',
    body: "This week's total weight lifted (sets × reps × weight) compared with last week's. Over 100% means you've lifted more than last week; if you didn't train last week it shows 100% once you log a workout.",
  },
};

/* ---------------- STORE ---------------- */

interface TrackerStore {
  // units system — everything is stored in metric (kg/km); these only
  // affect display formatting (see engine/units.ts) and the Account ->
  // Units of Measure picker.
  unitSystem: UnitSystem;
  unitPickerOpen: boolean;
  setUnitSystem: (sys: UnitSystem) => void;
  openUnitPicker: () => void;
  closeUnitPicker: () => void;

  // week/calendar navigation (shared by Home/Strength/Running)
  viewWeekOffset: number;
  viewDay: DayLabel;
  selectDay: (weekOffset: number, label: DayLabel) => void;
  shiftWeek: (delta: number) => void;
  resetToToday: () => void;
  isViewingToday: () => boolean;

  // sessions (mutable — swap/add/delete exercise)
  sessions: Record<SessionKey, Session>;
  activeSessionKey: SessionKey;
  setActiveSessionKey: (key: SessionKey) => void;
  findExerciseById: (id: string) => SessionExercise | null;
  // Exercise Analytics hub (Strength -> "Analytics"): every exercise across
  // all sessions (deduped by name) plus the rest of the exercise pool, so
  // you can pull up history/graphs for something not currently scheduled.
  getAllUsedExercises: () => SessionExercise[];
  getAllPoolExercises: () => SessionExercise[];
  analyticsSearch: string;
  setAnalyticsSearch: (val: string) => void;
  // Adds a new ad-hoc session (from the Custom Workout page) and makes it
  // active. Unlike the 4 preset days, it isn't pinned to a weekday — it
  // just shows up in "This Week's Program" and can be re-opened from there.
  createCustomSession: (name: string, exercises: { name: string; group: MuscleGroupKey | 'Custom' }[]) => SessionKey;

  // Program Editor: replaces the whole recurring program at once (split
  // template or custom sessions, day assignments, run days). Simplified
  // from the source: no legacyProgram/cutover snapshot, so past weeks
  // reflect whatever the program is *now*, not what it was historically.
  runSessions: Partial<Record<DayLabel, RunSessionPlan>>;
  setProgram: (sessions: Record<SessionKey, Session>, runSessions: Partial<Record<DayLabel, RunSessionPlan>>, split?: string, force?: boolean) => void;
  // The account's saved records — the single source everything else (activities,
  // stats, records, history) is derived from.
  workoutLogs: WorkoutLogRecord[];
  cardio: CardioRecord[];
  // Records that couldn't be uploaded (offline/server error) — kept here and
  // retried on the next launch, save or manual refresh so nothing is lost.
  pendingLogs: { sessionKey: string; sets: { exerciseName: string; reps: number; weight: number }[]; durationSec: number; date: number; localId: string }[];
  pendingCardio: (CardioRecord & { title: string })[];
  retryUnsynced: () => Promise<void>;
  // Everything the stats engine needs, in one object.
  getStatsInput: () => StatsInput;
  deleteActivity: (index: number) => Promise<boolean>;
  // Pulls Program/Preferences/Run history from the account after sign-in so
  // a returning user (or a reinstall) sees their real data, not fresh defaults.
  hydrateFromBackend: () => Promise<void>;
  accountLoaded: boolean; // true once the account's workouts and runs have been fetched

  programEdit: ProgramEditState | null;
  customSessionExercisePicker: string | null; // custom session name currently adding an exercise to
  openProgramEditor: () => void;
  closeProgramEditor: () => void;
  selectSplitTemplate: (key: string) => void;
  setNewSessionNameInput: (val: string) => void;
  addCustomSession: () => void;
  removeCustomSession: (name: string) => void;
  openCustomSessionExercisePicker: (sessionName: string) => void;
  closeCustomSessionExercisePicker: () => void;
  addExerciseToCustomSession: (name: string, group: MuscleGroupKey | 'Custom') => void;
  removeExerciseFromCustomSession: (sessionName: string, exId: string) => void;
  adjustCustomExerciseSets: (sessionName: string, exId: string, delta: number) => void;
  assignSessionDay: (sessionName: string, day: DayLabel) => void;
  toggleRunDay: (day: DayLabel) => void;
  saveProgramConfig: () => void;

  // Account -> Activity Summary / Data Highlights range toggles.
  activitySummaryRange: '1m' | '3m' | 'all';
  dataHighlightsRange: '1m' | '3m' | 'all';
  selectActivitySummaryRange: (range: '1m' | '3m' | 'all') => void;
  selectDataHighlightsRange: (range: '1m' | '3m' | 'all') => void;
  getActivitySummaryValues: () => { workouts: number; runs: number };
  // Best weekly consistency and peak training load inside the selected range.
  getDataHighlightsValues: () => { consistency: number; load: number };

  // Account settings pickers.
  runDefaultsPickerOpen: boolean;
  openRunDefaultsPicker: () => void;
  closeRunDefaultsPicker: () => void;
  restTimerPickerOpen: boolean;
  openRestTimerPicker: () => void;
  closeRestTimerPicker: () => void;
  selectDefaultRestDuration: (sec: number) => void;
  // Builds a CSV of every logged set (exercise, set #, weight kg, reps) —
  // returns the string rather than triggering a native share/download
  // itself, since that's a platform concern the screen should own.
  buildLoggedSetsCsv: () => string;

  // Activity history: log/detail screens.
  activities: ActivityItem[];
  activeActivityIndex: number | null;
  getActivityRoute: (a: ActivityItem) => 'RunDetail' | 'StrengthDetail' | 'OtherActivityDetail' | null;
  openActivityDetail: (index: number) => void;
  closeActivityDetail: () => void;
  logActivityType: ActivityType;
  logActivityTitle: string;
  logActivityDuration: string;
  logActivityDistance: string;
  openLogActivityForm: () => void;
  selectLogActivityType: (type: ActivityType) => void;
  setLogActivityTitle: (v: string) => void;
  setLogActivityDuration: (v: string) => void;
  setLogActivityDistance: (v: string) => void;
  saveLoggedActivity: () => void;

  // Run Detail's Share Card.
  shareCardStyle: 'compact' | 'stacked';
  shareCardYPct: number; // vertical position of the card on the photo, 0=top, 100=bottom
  runSharePhoto: string | null; // local image URI from expo-image-picker
  openRunShareCard: () => void;
  selectShareCardStyle: (style: 'compact' | 'stacked') => void;
  setShareCardYPct: (pct: number) => void;
  setRunSharePhoto: (uri: string | null) => void;

  // add-set sheet
  activeExerciseId: string | null; // the exercise whose log-set sheet is open
  viewedExerciseId: string | null; // the exercise whose history page is showing
  sets: Record<string, SetEntry[]>;
  weightInput: string;
  repsInput: string;
  openExercise: (id: string) => void;
  viewExerciseAnalytics: (id: string) => void;
  closeExerciseModal: () => void;
  setWeightInput: (v: string) => void;
  setRepsInput: (v: string) => void;
  incWeight: () => void;
  decWeight: () => void;
  incReps: () => void;
  decReps: () => void;
  addSet: () => void;
  updateSet: (exId: string, idx: number, field: 'weight' | 'reps', value: number) => void;
  removeSet: (exId: string, idx: number) => void;
  toggleSetDone: (exId: string, idx: number) => void;
  addSetTo: (exId: string) => void;

  // overview metric toggles
  enabled: Record<MetricContext, Record<string, boolean>>;
  // Left-to-right, top-to-bottom order of each page's overview tiles.
  order: Record<MetricContext, string[]>;
  moveMetric: (context: MetricContext, id: string, dir: -1 | 1) => void;
  toggleMetric: (context: MetricContext, id: string) => void;
  overviewContext: MetricContext;
  setOverviewContext: (context: MetricContext) => void;
  metricDetailOpen: keyof typeof METRIC_INFO | null;
  openMetricDetail: (id: keyof typeof METRIC_INFO) => void;
  closeMetricDetail: () => void;

  // session overview screen
  expandedExercises: string[];
  toggleExpandExercise: (id: string) => void;
  editingExercises: boolean;
  toggleEditExercises: () => void;
  swapContext: { sessionKey: SessionKey; exId: string } | null;
  openSwapExercise: (sessionKey: SessionKey, exId: string) => void;
  closeSwapExercise: () => void;
  performSwap: (newName: string) => void;
  deleteExercise: (sessionKey: SessionKey, exId: string) => void;
  addExerciseFor: SessionKey | null;
  addExerciseSearch: string;
  openAddExercise: (sessionKey: SessionKey) => void;
  closeAddExercise: () => void;
  setAddExerciseSearch: (val: string) => void;
  addExerciseToSession: (name: string, group: MuscleGroupKey | 'Custom') => void;
  customExerciseCounter: number;

  // live workout + rest timer
  workout: { active: boolean; seconds: number; startedAt: number | null };
  workoutSnapshotCounts: Record<string, number> | null;
  startWorkout: () => void;
  tickWorkout: () => void;
  // Discards any sets logged since startWorkout() and ends the workout.
  cancelWorkout: () => void;
  // Saves sets logged since startWorkout() to the backend and ends the
  // workout. Resolves ok:false (with the local state already ended, sets
  // kept) if the save fails — nothing logged locally is lost, it just
  // didn't sync.
  // Saves the checked-off sets (plus the unchecked ones that have reps, when includeUnchecked is set).
  finishWorkout: (opts?: { includeUnchecked?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  restTimer: { status: 'idle' | 'running' | 'paused'; duration: number; remaining: number; cycles: number; customOpen: boolean };
  selectRestPreset: (seconds: number) => void;
  openCustomRest: () => void;
  adjustRestTimer: (delta: number) => void;
  startRestTimer: () => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  finishRestTimer: () => void;
  tickRestTimer: () => void;

  // exercise detail
  exerciseDetailTab: 'sets' | 'analyze' | '1rm';
  selectExerciseTab: (id: 'sets' | 'analyze' | '1rm') => void;

  // new-session sheet
  sheetOpen: boolean;
  sheetTab: 'strength' | 'run';
  openAddSession: () => void;
  closeAddSession: () => void;

  // activity filters
  activityFilter: { range: 'week' | 'month' | 'year' | 'all'; type: ActivityType | 'all' };
  filterSheetOpen: 'range' | 'type' | null;
  openFilterSheet: (which: 'range' | 'type') => void;
  closeFilterSheet: () => void;
  setActivityFilter: (kind: 'range' | 'type', val: string) => void;

  // run tracker
  runTrackerOpen: boolean;
  runStatus: RunStatus;
  // Set when location permission was refused at the start of a run, so the
  // overlay can tell the user why no distance is being recorded.
  gpsIssue: 'denied' | null;
  countdownVal: number;
  run: { elapsed: number; distance: number; intervalCount: number; route: RoutePoint[]; maxSpeedKmh: number };
  runSetupOpen: boolean;
  runType: RunType;
  distanceGoal: number;
  distanceCustom: boolean;
  customDistanceVal: number;
  intervalMeters: number;
  intervalReps: number;
  openRunTracker: () => void;
  closeRunTracker: () => void;
  beginRunCountdown: () => void;
  tickCountdown: () => void;
  toggleRunPause: () => void;
  tickRun: () => void;
  // Appends a real GPS fix to the in-progress route, discarding implausible
  // jumps (bad fixes) and adding the incremental haversine distance from
  // the previous point. Called from the background location task, not a
  // React component — see engine/locationTask.ts.
  addRoutePoint: (point: RoutePoint) => void;
  // Saves the just-completed run into activity history (with its real
  // route) and closes the tracker. Distinct from closeRunTracker, which
  // discards — matches the Cancel/Finish distinction the workout tracker
  // already makes.
  finishRun: () => void;
  // The "workout complete" screen shown right after a run or workout is finished.
  workoutSummary: WorkoutSummaryData | null;
  closeWorkoutSummary: () => void;
  summaryStartInShare: boolean; // open the summary straight on the share designs
  openWorkoutSummary: (summary: WorkoutSummaryData, startInShare?: boolean) => void;
  runStartedAt: number | null; // wall-clock moment the countdown ended and the run began
  openRunSetup: () => void;
  closeRunSetup: () => void;
  selectRunType: (t: RunType) => void;
  selectDistanceGoal: (d: number) => void;
  openCustomDistance: () => void;
  adjustCustomDistance: (delta: number) => void;
  incIntervalMeters: () => void;
  decIntervalMeters: () => void;
  incIntervalReps: () => void;
  decIntervalReps: () => void;
  startRunFromSetup: () => void;
}

const REST_TIMER_DEFAULT = { status: 'idle' as const, duration: 60, remaining: 60, cycles: 0, customOpen: false };
const RUN_DEFAULT = { elapsed: 0, distance: 0, intervalCount: 0, route: [] as RoutePoint[], maxSpeedKmh: 0 };

export const useTrackerStore = create<TrackerStore>((set, get) => ({
  unitSystem: 'metric',
  unitPickerOpen: false,
  setUnitSystem: (sys) => {
    set({ unitSystem: sys, unitPickerOpen: false });
    persistSettings({ unitSystem: sys });
  },
  openUnitPicker: () => set({ unitPickerOpen: true }),
  closeUnitPicker: () => set({ unitPickerOpen: false }),

  viewWeekOffset: 0,
  viewDay: getTodayShort(),
  selectDay: (weekOffset, label) => set({ viewWeekOffset: weekOffset, viewDay: label }),
  shiftWeek: (delta) => set((s) => ({ viewWeekOffset: s.viewWeekOffset + delta })),
  resetToToday: () => set({ viewWeekOffset: 0, viewDay: getTodayShort() }),
  isViewingToday: () => calendarIsViewingToday(get().viewWeekOffset, get().viewDay),

  sessions: {},
  activeSessionKey: '',
  setActiveSessionKey: (key) => set({ activeSessionKey: key }),
  createCustomSession: (name, exercises) => {
    const key = name.trim() || 'Custom Workout';
    let uniqueKey = key;
    let n = 2;
    while (get().sessions[uniqueKey]) {
      uniqueKey = `${key} (${n})`;
      n += 1;
    }
    const session: Session = {
      day: 'Unscheduled',
      duration: 45,
      muscleGroups: [],
      exercises: exercises.map((ex, i) => ({ id: `custom${get().customExerciseCounter + i}`, name: ex.name, group: ex.group, sets: 3, previous: null })),
    };
    set((s) => ({
      sessions: { ...s.sessions, [uniqueKey]: session },
      customExerciseCounter: s.customExerciseCounter + exercises.length,
    }));
    persistProgram(get().sessions, get().runSessions);
    exercises.filter((ex) => ex.group === 'Custom').forEach((ex) => saveCustomExercise({ name: ex.name, group: ex.group }).catch(() => {}));
    return uniqueKey;
  },

  runSessions: {},
  setProgram: (sessions, runSessions, split, force) => {
    persistProgram(sessions, runSessions, split, force);
    set({
      sessions,
      runSessions,
      activeSessionKey: Object.keys(sessions)[0] || '',
      viewWeekOffset: 0,
      viewDay: getTodayShort(),
    });
  },
  workoutLogs: [],
  cardio: [],
  pendingLogs: [],
  pendingCardio: [],
  accountLoaded: false,
  hydrateFromBackend: async () => {
    set({ accountLoaded: false });
    const [programRes, prefsRes, runActivitiesRes, workoutLogsRes] = await Promise.allSettled([
      getProgram(),
      getPreferences(),
      getRunActivities(),
      getWorkoutLogs(),
    ]);

    // Records first, so the program below can show real "previous" weights.
    if (workoutLogsRes.status === 'fulfilled') set({ workoutLogs: workoutLogsRes.value.map(workoutLogFromResponse) });
    if (runActivitiesRes.status === 'fulfilled') set({ cardio: runActivitiesRes.value.map(cardioFromResponse) });
    set((s) => ({ activities: buildActivities(s.workoutLogs, s.cardio) }));

    if (programRes.status === 'fulfilled') {
      // The account answered (with a program or with "none yet"), so it's safe
      // to write program edits back from now on.
      enableProgramSync();
      const p = programRes.value;
      if (p && p.sessions.length > 0) {
        const sessions: Record<SessionKey, Session> = {};
        p.sessions.forEach((sess) => {
          const exercises: SessionExercise[] = sess.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            group: ex.group as MuscleGroupKey | 'Custom',
            sets: ex.sets,
            previous: ex.previous ?? null,
          }));
          sessions[sess.key] = { day: sess.day, duration: sess.duration, exercises, muscleGroups: deriveMuscleGroups(exercises) };
        });
        const runSessions: Partial<Record<DayLabel, RunSessionPlan>> = {};
        (p.runDays ?? []).forEach((rd) => {
          runSessions[rd.day as DayLabel] = {
            type: rd.type,
            duration: rd.duration,
            distance: rd.distance,
            pace: rd.pace,
            zoneTag: rd.zoneTag,
            zoneDetail: rd.zoneDetail,
            effort: rd.effort,
          };
        });
        set((s) => ({
          sessions: withPreviousWeights(sessions, s.workoutLogs),
          runSessions,
          activeSessionKey: Object.keys(sessions)[0] ?? s.activeSessionKey,
        }));
      }
    }

    // Tile order: the account's copy if there is one, else what this device saved.
    {
      const fromAccount = prefsRes.status === 'fulfilled' ? prefsRes.value?.settings?.metricOrder : undefined;
      const stored =
        fromAccount ??
        (await SecureStore.getItemAsync(METRIC_ORDER_KEY)
          .then((v) => (v ? (JSON.parse(v) as Record<string, string[]>) : undefined))
          .catch(() => undefined));
      if (stored) set((s) => ({ order: mergeMetricOrder(s.order, stored) }));
    }

    if (prefsRes.status === 'fulfilled' && prefsRes.value) {
      const prefs = prefsRes.value;
      const enabledMetrics = (prefs.enabledMetrics ?? {}) as Partial<Record<MetricContext, Record<string, boolean>>>;
      const st = prefs.settings;
      set((s) => ({
        enabled: {
          home: { ...s.enabled.home, ...enabledMetrics.home },
          strength: { ...s.enabled.strength, ...enabledMetrics.strength },
          running: { ...s.enabled.running, ...enabledMetrics.running },
        },
        ...(st?.unitSystem ? { unitSystem: st.unitSystem } : {}),
        ...(st?.runType ? { runType: st.runType } : {}),
        ...(st?.distanceGoal ? { distanceGoal: st.distanceGoal, ...(([1, 3, 5, 10, 21, 42] as number[]).includes(st.distanceGoal) ? {} : { distanceCustom: true, customDistanceVal: st.distanceGoal }) } : {}),
        ...(st?.restDuration
          ? { restTimer: { ...s.restTimer, duration: st.restDuration, remaining: s.restTimer.status === 'idle' ? st.restDuration : s.restTimer.remaining } }
          : {}),
      }));
    }

    set({ accountLoaded: true });
    get().retryUnsynced().catch(() => {});
  },

  retryUnsynced: async () => {
    const { pendingLogs, pendingCardio } = get();
    for (const p of pendingLogs) {
      try {
        const saved = await saveWorkoutLog(p.sessionKey, p.sets, { durationSec: p.durationSec, date: new Date(p.date).toISOString() });
        set((s) => {
          const workoutLogs = s.workoutLogs.map((l) => (l.id === p.localId ? workoutLogFromResponse(saved) : l));
          return { workoutLogs, activities: buildActivities(workoutLogs, s.cardio), pendingLogs: s.pendingLogs.filter((x) => x.localId !== p.localId) };
        });
      } catch {
        // still offline / failing — stays queued for next time
      }
    }
    for (const c of pendingCardio) {
      try {
        const saved = await saveRunActivity({ type: c.type, title: c.title, distance: c.distanceKm, duration: String(c.durationMin), date: new Date(c.date).toISOString(), route: c.route ?? null });
        set((s) => {
          const cardio = s.cardio.map((x) => (x.id === c.id ? cardioFromResponse(saved) : x));
          return { cardio, activities: buildActivities(s.workoutLogs, cardio), pendingCardio: s.pendingCardio.filter((x) => x.id !== c.id) };
        });
      } catch {
        // stays queued
      }
    }
  },

  getStatsInput: () => {
    const s = get();
    return {
      now: Date.now(),
      activities: s.activities,
      workoutLogs: s.workoutLogs,
      sessions: s.sessions,
      runSessions: s.runSessions,
      health: useHealthStore.getState().snapshot,
      unitSystem: s.unitSystem,
    };
  },

  deleteActivity: async (index) => {
    const a = get().activities[index];
    if (!a) return false;
    const log = a.type === 'strength' ? get().workoutLogs.find((l) => l.date === a.date && `${l.sessionKey} Workout` === a.title) : null;
    const rec = a.type !== 'strength' ? get().cardio.find((c) => c.date === a.date && c.title === a.title && c.type === a.type) : null;
    const target = log ?? rec;
    if (!target) return false;
    const isLocal = target.id.startsWith('local-');
    try {
      if (!isLocal) {
        if (log) await deleteWorkoutLog(log.id);
        else if (rec) await deleteRunActivity(rec.id);
      }
    } catch {
      return false;
    }
    set((s) => {
      const workoutLogs = log ? s.workoutLogs.filter((l) => l.id !== log.id) : s.workoutLogs;
      const cardio = rec ? s.cardio.filter((c) => c.id !== rec.id) : s.cardio;
      return {
        workoutLogs,
        cardio,
        pendingLogs: s.pendingLogs.filter((p) => p.localId !== target.id),
        pendingCardio: s.pendingCardio.filter((p) => p.id !== target.id),
        activities: buildActivities(workoutLogs, cardio),
        activeActivityIndex: null,
      };
    });
    return true;
  },

  programEdit: null,
  customSessionExercisePicker: null,
  // Detects which split the current program matches (by comparing session
  // names) so the editor opens pre-selected on whatever's actually active;
  // falls back to 'custom' with the current sessions copied in if nothing matches.
  openProgramEditor: () => {
    const { sessions, runSessions } = get();
    const currentKeys = Object.keys(sessions).sort().join('|');
    let detectedSplit: string | null = null;
    for (const key of Object.keys(SPLIT_TEMPLATES)) {
      if (Object.keys(SPLIT_TEMPLATES[key].sessions).sort().join('|') === currentKeys) {
        detectedSplit = key;
        break;
      }
    }
    const dayAssignments: Partial<Record<string, DayLabel>> = {};
    Object.keys(sessions).forEach((key) => {
      const short = FULL_TO_DAY_LABEL[sessions[key].day];
      if (short) dayAssignments[key] = short;
    });
    let customSessions: Record<string, { exercises: SessionExercise[] }> = {};
    if (!detectedSplit) {
      detectedSplit = 'custom';
      Object.keys(sessions).forEach((key) => {
        customSessions[key] = { exercises: sessions[key].exercises.map((ex) => ({ ...ex })) };
      });
    }
    set({
      programEdit: {
        splitKey: detectedSplit,
        dayAssignments,
        runDays: Object.keys(runSessions) as DayLabel[],
        customSessions,
        newSessionNameInput: '',
      },
    });
  },
  closeProgramEditor: () => set({ programEdit: null }),
  selectSplitTemplate: (key) =>
    set((s) => (s.programEdit ? { programEdit: { ...s.programEdit, splitKey: key, dayAssignments: {} } } : {})),
  setNewSessionNameInput: (val) => set((s) => (s.programEdit ? { programEdit: { ...s.programEdit, newSessionNameInput: val } } : {})),
  addCustomSession: () =>
    set((s) => {
      if (!s.programEdit) return {};
      const name = s.programEdit.newSessionNameInput.trim();
      if (!name || s.programEdit.customSessions[name]) return {};
      return {
        programEdit: {
          ...s.programEdit,
          customSessions: { ...s.programEdit.customSessions, [name]: { exercises: [] } },
          newSessionNameInput: '',
        },
      };
    }),
  removeCustomSession: (name) =>
    set((s) => {
      if (!s.programEdit) return {};
      const customSessions = { ...s.programEdit.customSessions };
      delete customSessions[name];
      const dayAssignments = { ...s.programEdit.dayAssignments };
      delete dayAssignments[name];
      return { programEdit: { ...s.programEdit, customSessions, dayAssignments } };
    }),
  openCustomSessionExercisePicker: (sessionName) => set({ customSessionExercisePicker: sessionName, addExerciseSearch: '' }),
  closeCustomSessionExercisePicker: () => set({ customSessionExercisePicker: null, addExerciseSearch: '' }),
  addExerciseToCustomSession: (name, group) => {
    set((s) => {
      if (!s.programEdit || !s.customSessionExercisePicker) return {};
      const sessName = s.customSessionExercisePicker;
      const sess = s.programEdit.customSessions[sessName];
      if (!sess) return {};
      const newId = 'pcustom' + s.customExerciseCounter;
      const exercises = [...sess.exercises, { id: newId, name, group, sets: 3, previous: null }];
      return {
        programEdit: { ...s.programEdit, customSessions: { ...s.programEdit.customSessions, [sessName]: { exercises } } },
        customExerciseCounter: s.customExerciseCounter + 1,
        addExerciseSearch: '',
      };
    });
    if (group === 'Custom') saveCustomExercise({ name, group }).catch(() => {});
  },
  removeExerciseFromCustomSession: (sessionName, exId) =>
    set((s) => {
      if (!s.programEdit) return {};
      const sess = s.programEdit.customSessions[sessionName];
      if (!sess) return {};
      const exercises = sess.exercises.filter((e) => e.id !== exId);
      return { programEdit: { ...s.programEdit, customSessions: { ...s.programEdit.customSessions, [sessionName]: { exercises } } } };
    }),
  adjustCustomExerciseSets: (sessionName, exId, delta) =>
    set((s) => {
      if (!s.programEdit) return {};
      const sess = s.programEdit.customSessions[sessionName];
      if (!sess) return {};
      const exercises = sess.exercises.map((e) => (e.id === exId ? { ...e, sets: Math.max(1, Math.min(8, e.sets + delta)) } : e));
      return { programEdit: { ...s.programEdit, customSessions: { ...s.programEdit.customSessions, [sessionName]: { exercises } } } };
    }),
  // Tapping a day toggles it off if it's already this session's day;
  // otherwise it steals the day from whichever session had it.
  assignSessionDay: (sessionName, day) =>
    set((s) => {
      if (!s.programEdit) return {};
      const current = { ...s.programEdit.dayAssignments };
      if (current[sessionName] === day) {
        delete current[sessionName];
      } else {
        Object.keys(current).forEach((k) => {
          if (current[k] === day) delete current[k];
        });
        current[sessionName] = day;
      }
      return { programEdit: { ...s.programEdit, dayAssignments: current } };
    }),
  toggleRunDay: (day) =>
    set((s) => {
      if (!s.programEdit) return {};
      const runDays = s.programEdit.runDays.includes(day) ? s.programEdit.runDays.filter((d) => d !== day) : [...s.programEdit.runDays, day];
      return { programEdit: { ...s.programEdit, runDays } };
    }),
  saveProgramConfig: () => {
    const pe = get().programEdit;
    if (!pe) return;
    const isCustom = pe.splitKey === 'custom';
    const sourceSessions = isCustom ? pe.customSessions : SPLIT_TEMPLATES[pe.splitKey]?.sessions;
    if (!sourceSessions) return;

    const existing = get().sessions;
    const newSessions: Record<SessionKey, Session> = {};
    Object.keys(sourceSessions).forEach((sessName) => {
      const dayShort = pe.dayAssignments[sessName];
      if (!dayShort) return;
      if (isCustom) {
        const exercises = (sourceSessions as Record<string, { exercises: SessionExercise[] }>)[sessName].exercises;
        newSessions[sessName] = { duration: Math.max(30, exercises.length * 11), muscleGroups: deriveMuscleGroups(exercises), exercises, day: DAY_FULL_MAP[dayShort] };
      } else if (existing[sessName]) {
        // Same session name as one the user already has — keep their swaps,
        // additions and deletions; only the day can change.
        newSessions[sessName] = { ...existing[sessName], day: DAY_FULL_MAP[dayShort] };
      } else {
        const tmpl = (sourceSessions as Record<string, Omit<Session, 'day'>>)[sessName];
        newSessions[sessName] = { ...tmpl, day: DAY_FULL_MAP[dayShort] };
      }
    });

    // Keep run plans for days that stay; build sensible ones only for new run days.
    const keptRuns: Partial<Record<DayLabel, RunSessionPlan>> = {};
    const freshDays: DayLabel[] = [];
    pe.runDays.forEach((d) => {
      const kept = get().runSessions[d];
      if (kept) keptRuns[d] = kept;
      else freshDays.push(d);
    });
    const newRunSessions = { ...keptRuns, ...buildRunPlans(freshDays, 'fun', 'intermediate') };

    get().setProgram(withPreviousWeights(newSessions, get().workoutLogs), newRunSessions, pe.splitKey, true);
    set({ programEdit: null });
  },

  activitySummaryRange: 'all',
  dataHighlightsRange: 'all',
  selectActivitySummaryRange: (range) => set({ activitySummaryRange: range }),
  selectDataHighlightsRange: (range) => set({ dataHighlightsRange: range }),
  getActivitySummaryValues: () => {
    const { activitySummaryRange, activities } = get();
    const cutoffDays = activitySummaryRange === '1m' ? 30 : activitySummaryRange === '3m' ? 90 : Infinity;
    const inRange = activities.filter((a) => activityDaysAgo(a) <= cutoffDays);
    return { workouts: inRange.filter((a) => a.type === 'strength').length, runs: inRange.filter((a) => a.type === 'running').length };
  },
  getDataHighlightsValues: () => computeDataHighlights(get().getStatsInput(), get().dataHighlightsRange),

  runDefaultsPickerOpen: false,
  openRunDefaultsPicker: () => set({ runDefaultsPickerOpen: true }),
  closeRunDefaultsPicker: () => set({ runDefaultsPickerOpen: false }),
  restTimerPickerOpen: false,
  openRestTimerPicker: () => set({ restTimerPickerOpen: true }),
  closeRestTimerPicker: () => set({ restTimerPickerOpen: false }),
  selectDefaultRestDuration: (sec) =>
    set((s) => ({
      restTimer: { ...s.restTimer, duration: sec, remaining: s.restTimer.status === 'idle' ? sec : s.restTimer.remaining },
      restTimerPickerOpen: false,
    })),
  // (the rest-timer default is also saved to the account — see below)
  buildLoggedSetsCsv: () => {
    const rows: string[][] = [['Date', 'Workout', 'Exercise', 'Set', 'Weight (kg)', 'Reps']];
    [...get().workoutLogs]
      .sort((a, b) => a.date - b.date)
      .forEach((log) => {
        const counts: Record<string, number> = {};
        log.sets.forEach((st) => {
          counts[st.exerciseName] = (counts[st.exerciseName] || 0) + 1;
          rows.push([new Date(log.date).toISOString().slice(0, 10), log.sessionKey, st.exerciseName, String(counts[st.exerciseName]), String(st.weight), String(st.reps)]);
        });
      });
    return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  },

  activities: [],
  activeActivityIndex: null,
  getActivityRoute: (a) => {
    if (a.type === 'running' && a.runStats) return 'RunDetail';
    if (a.type === 'strength' && a.strengthStats) return 'StrengthDetail';
    if (a.otherStats) return 'OtherActivityDetail';
    return null;
  },
  openActivityDetail: (index) => set({ activeActivityIndex: index }),
  closeActivityDetail: () => set({ activeActivityIndex: null }),

  logActivityType: 'cycling',
  logActivityTitle: '',
  logActivityDuration: '',
  logActivityDistance: '',
  openLogActivityForm: () =>
    set({
      sheetOpen: false,
      logActivityType: 'cycling',
      logActivityTitle: LOGGABLE_ACTIVITY_TYPES[0].defaultTitle,
      logActivityDuration: '',
      logActivityDistance: '',
    }),
  selectLogActivityType: (type) =>
    set((s) => {
      const wasDefault = LOGGABLE_ACTIVITY_TYPES.some((t) => t.defaultTitle === s.logActivityTitle);
      const typeInfo = LOGGABLE_ACTIVITY_TYPES.find((t) => t.id === type)!;
      return { logActivityType: type, logActivityTitle: wasDefault ? typeInfo.defaultTitle : s.logActivityTitle };
    }),
  setLogActivityTitle: (v) => set({ logActivityTitle: v }),
  setLogActivityDuration: (v) => set({ logActivityDuration: v }),
  setLogActivityDistance: (v) => set({ logActivityDistance: v }),
  saveLoggedActivity: () => {
    const { logActivityDuration, logActivityType, logActivityDistance, logActivityTitle, unitSystem } = get();
    const dur = parseFloat(logActivityDuration);
    if (!dur || dur <= 0) return;
    const typeInfo = LOGGABLE_ACTIVITY_TYPES.find((t) => t.id === logActivityType)!;
    const enteredDist = parseFloat(logActivityDistance) || 0;
    const distKm = typeInfo.hasDistance && enteredDist > 0 ? distanceToKm(enteredDist, unitSystem) : 0;
    const title = logActivityTitle.trim() || typeInfo.defaultTitle;
    const record: CardioRecord = { id: `local-${Date.now()}`, type: logActivityType, title, date: Date.now(), distanceKm: distKm, durationMin: dur };
    set((s) => {
      const cardio = [record, ...s.cardio];
      return { cardio, activities: buildActivities(s.workoutLogs, cardio) };
    });
    saveRunActivity({ type: logActivityType, title, distance: distKm, duration: String(dur), date: new Date(record.date).toISOString() })
      .then((saved) =>
        set((s) => {
          const cardio = s.cardio.map((c) => (c.id === record.id ? cardioFromResponse(saved) : c));
          return { cardio, activities: buildActivities(s.workoutLogs, cardio) };
        }),
      )
      .catch(() => set((s) => ({ pendingCardio: [...s.pendingCardio, record] })));
  },

  shareCardStyle: 'compact',
  shareCardYPct: 50,
  runSharePhoto: null,
  openRunShareCard: () => set({ runSharePhoto: null, shareCardStyle: 'compact', shareCardYPct: 50 }),
  selectShareCardStyle: (style) => set({ shareCardStyle: style }),
  setShareCardYPct: (pct) => set({ shareCardYPct: Math.max(0, Math.min(100, pct)) }),
  setRunSharePhoto: (uri) => set({ runSharePhoto: uri }),

  findExerciseById: (id) => {
    const sessions = get().sessions;
    for (const key of Object.keys(sessions) as SessionKey[]) {
      const found = sessions[key].exercises.find((e) => e.id === id);
      if (found) return found;
    }
    if (id.startsWith('pool_')) {
      return get().getAllPoolExercises().find((e) => e.id === id) || null;
    }
    return null;
  },
  getAllUsedExercises: () => {
    const sessions = get().sessions;
    const seen = new Set<string>();
    const list: SessionExercise[] = [];
    (Object.keys(sessions) as SessionKey[]).forEach((key) => {
      sessions[key].exercises.forEach((ex) => {
        if (!seen.has(ex.name)) {
          seen.add(ex.name);
          list.push(ex);
        }
      });
    });
    return list;
  },
  getAllPoolExercises: () => {
    const used = new Set(get().getAllUsedExercises().map((e) => e.name));
    const list: SessionExercise[] = [];
    (Object.keys(EXERCISE_POOL) as MuscleGroupKey[]).forEach((group) => {
      EXERCISE_POOL[group].forEach((name) => {
        if (!used.has(name)) {
          const id = 'pool_' + slugify(name);
          list.push({ id, name, group, sets: 3, previous: lastLoggedWeight(name, get().workoutLogs) });
        }
      });
    });
    return list;
  },
  analyticsSearch: '',
  setAnalyticsSearch: (val) => set({ analyticsSearch: val }),

  activeExerciseId: null,
  viewedExerciseId: null,
  sets: {},
  weightInput: '',
  repsInput: '',
  openExercise: (id) => set({ activeExerciseId: id, weightInput: '', repsInput: '' }),
  // Opening an exercise's history must not also pop the log-set sheet — that sheet is driven by activeExerciseId alone.
  viewExerciseAnalytics: (id) => set({ viewedExerciseId: id, exerciseDetailTab: 'sets' }),
  closeExerciseModal: () => set({ activeExerciseId: null }),
  setWeightInput: (v) => set({ weightInput: v }),
  setRepsInput: (v) => set({ repsInput: v }),
  incWeight: () =>
    set((s) => ({ weightInput: String(Math.max(0, (parseFloat(s.weightInput) || 0) + weightStepFor(s.unitSystem))) })),
  decWeight: () =>
    set((s) => ({ weightInput: String(Math.max(0, (parseFloat(s.weightInput) || 0) - weightStepFor(s.unitSystem))) })),
  incReps: () => set((s) => ({ repsInput: String(Math.max(0, (parseInt(s.repsInput, 10) || 0) + 1)) })),
  decReps: () => set((s) => ({ repsInput: String(Math.max(0, (parseInt(s.repsInput, 10) || 0) - 1)) })),
  // weightInput is in the *current display unit* (matches what the user
  // sees/typed) — converted to the canonical kg the rest of the app stores
  // only here, at save time.
  addSet: () => {
    const { activeExerciseId, weightInput, repsInput, sets, unitSystem } = get();
    if (!activeExerciseId) return;
    const enteredWeight = parseFloat(weightInput);
    const reps = parseInt(repsInput, 10);
    if (!Number.isFinite(enteredWeight) || !Number.isFinite(reps) || enteredWeight <= 0 || reps <= 0) return;
    const weight = weightToKg(enteredWeight, unitSystem);
    // A set logged with no workout running would never be saved — start one for
    // the session this exercise belongs to (before adding, so the snapshot
    // taken at start excludes this set).
    if (!get().workout.active) {
      const { sessions } = get();
      const key = Object.keys(sessions).find((k) => sessions[k].exercises.some((e) => e.id === activeExerciseId));
      if (key) {
        set({ activeSessionKey: key });
        get().startWorkout();
      }
    }
    const list = get().sets[activeExerciseId] || [];
    const next = [...list, { num: list.length + 1, weight, reps, done: true }];
    set({ sets: { ...get().sets, [activeExerciseId]: next }, weightInput: '', repsInput: '' });
  },
  updateSet: (exId, idx, field, value) =>
    set((s) => {
      const list = s.sets[exId];
      if (!list || !list[idx] || list[idx].done) return {}; // a checked-off set is locked until it's unchecked
      const next = list.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
      return { sets: { ...s.sets, [exId]: next } };
    }),
  // Renumbers the rest of the list after a delete — `num` is used both as
  // display text ("Set N") and as AddSetSheet's list key, so leaving gaps
  // (e.g. deleting set 2 of 3 leaving nums 1,3) shows a wrong label and
  // risks a React key collision the next time a set is added.
  removeSet: (exId, idx) =>
    set((s) => ({
      sets: {
        ...s.sets,
        [exId]: (s.sets[exId] || []).filter((_, i) => i !== idx).map((row, i) => ({ ...row, num: i + 1 })),
      },
    })),
  addSetTo: (exId) =>
    set((s) => {
      const list = s.sets[exId] || [];
      const last = list[list.length - 1];
      const next = [...list, { num: list.length + 1, weight: last ? last.weight : 0, reps: last ? last.reps : 0, done: false }];
      return { sets: { ...s.sets, [exId]: next } };
    }),
  toggleSetDone: (exId, idx) =>
    set((s) => {
      const list = s.sets[exId];
      if (!list || !list[idx]) return {};
      return { sets: { ...s.sets, [exId]: list.map((row, i) => (i === idx ? { ...row, done: !row.done } : row)) } };
    }),

  enabled: { home: { ...OVERVIEW_DEFAULTS.home }, strength: { ...OVERVIEW_DEFAULTS.strength }, running: { ...OVERVIEW_DEFAULTS.running } },
  order: defaultOrder(),
  // Swaps a tile with the nearest visible one in that direction (hidden tiles
  // have no position on the page, so they're skipped).
  moveMetric: (context, id, dir) => {
    const { order, enabled } = get();
    const list = [...order[context]];
    const from = list.indexOf(id);
    if (from < 0) return;
    let to = from + dir;
    while (to >= 0 && to < list.length && !enabled[context][list[to]]) to += dir;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    const next = { ...order, [context]: list };
    set({ order: next });
    SecureStore.setItemAsync(METRIC_ORDER_KEY, JSON.stringify(next)).catch(() => {});
    persistSettings({ metricOrder: next });
  },
  toggleMetric: (context, id) => {
    set((s) => ({ enabled: { ...s.enabled, [context]: { ...s.enabled[context], [id]: !s.enabled[context][id] } } }));
    savePreferences({ enabledMetrics: get().enabled }).catch(() => {});
  },
  overviewContext: 'home',
  setOverviewContext: (context) => set({ overviewContext: context }),
  metricDetailOpen: null,
  openMetricDetail: (id) => set({ metricDetailOpen: id }),
  closeMetricDetail: () => set({ metricDetailOpen: null }),

  expandedExercises: [],
  toggleExpandExercise: (id) =>
    set((s) => ({
      expandedExercises: s.expandedExercises.includes(id)
        ? s.expandedExercises.filter((x) => x !== id)
        : [...s.expandedExercises, id],
    })),
  editingExercises: false,
  toggleEditExercises: () => set((s) => ({ editingExercises: !s.editingExercises })),
  swapContext: null,
  openSwapExercise: (sessionKey, exId) => set({ swapContext: { sessionKey, exId } }),
  closeSwapExercise: () => set({ swapContext: null }),
  performSwap: (newName) => {
    const ctx = get().swapContext;
    if (!ctx) return;
    set((s) => {
      const session = s.sessions[ctx.sessionKey];
      const exercises = session.exercises.map((e) => (e.id === ctx.exId ? { ...e, name: newName, previous: null } : e));
      return {
        sessions: { ...s.sessions, [ctx.sessionKey]: { ...session, exercises } },
        sets: { ...s.sets, [ctx.exId]: [] }, // logged sets belonged to the exercise that was just swapped out
        swapContext: null,
      };
    });
    persistProgram(get().sessions, get().runSessions);
  },
  deleteExercise: (sessionKey, exId) => {
    set((s) => {
      const session = s.sessions[sessionKey];
      const exercises = session.exercises.filter((e) => e.id !== exId);
      const sets = { ...s.sets };
      delete sets[exId];
      return {
        sessions: { ...s.sessions, [sessionKey]: { ...session, exercises } },
        sets,
        expandedExercises: s.expandedExercises.filter((id) => id !== exId),
      };
    });
    persistProgram(get().sessions, get().runSessions);
  },
  addExerciseFor: null,
  addExerciseSearch: '',
  openAddExercise: (sessionKey) => set({ addExerciseFor: sessionKey, addExerciseSearch: '' }),
  closeAddExercise: () => set({ addExerciseFor: null, addExerciseSearch: '' }),
  setAddExerciseSearch: (val) => set({ addExerciseSearch: val }),
  customExerciseCounter: 1,
  addExerciseToSession: (name, group) => {
    const sessionKey = get().addExerciseFor;
    if (!sessionKey) return;
    set((s) => {
      const newId = 'custom' + s.customExerciseCounter;
      const session = s.sessions[sessionKey];
      const exercises = [...session.exercises, { id: newId, name, group, sets: 3, previous: null }];
      return {
        sessions: { ...s.sessions, [sessionKey]: { ...session, exercises } },
        customExerciseCounter: s.customExerciseCounter + 1,
        // Only reset the search box, not `addExerciseFor` — closing the sheet
        // after every single pick meant re-opening "Add Exercise" from
        // scratch for each one. Matches addExerciseToCustomSession's
        // behavior, which already got this right.
        addExerciseSearch: '',
      };
    });
    persistProgram(get().sessions, get().runSessions);
    if (group === 'Custom') saveCustomExercise({ name, group }).catch(() => {});
  },

  workout: { active: false, seconds: 0, startedAt: null },
  workoutSnapshotCounts: null,
  startWorkout: () => {
    const { activeSessionKey, sessions, sets } = get();
    const session = sessions[activeSessionKey];
    if (!session) return;
    const snapshot: Record<string, number> = {};
    session.exercises.forEach((ex) => {
      snapshot[ex.id] = (sets[ex.id] || []).length;
    });
    set({ workout: { active: true, seconds: 0, startedAt: Date.now() }, restTimer: { ...REST_TIMER_DEFAULT }, workoutSnapshotCounts: snapshot });
  },
  // Elapsed time comes from the start timestamp, not from counting ticks, so
  // it stays right while the app is backgrounded or the screen is locked.
  tickWorkout: () =>
    set((s) => (s.workout.startedAt ? { workout: { ...s.workout, seconds: Math.floor((Date.now() - s.workout.startedAt) / 1000) } } : {})),
  cancelWorkout: () => {
    const { workoutSnapshotCounts, sets, activeSessionKey, sessions } = get();
    const nextSets = { ...sets };
    if (workoutSnapshotCounts && sessions[activeSessionKey]) {
      sessions[activeSessionKey].exercises.forEach((ex) => {
        const keepCount = workoutSnapshotCounts[ex.id] ?? 0;
        nextSets[ex.id] = (sets[ex.id] || []).slice(0, keepCount);
      });
    }
    set((s) => ({
      sets: nextSets,
      workout: { active: false, seconds: 0, startedAt: null },
      restTimer: { ...s.restTimer, status: 'idle' },
      workoutSnapshotCounts: null,
    }));
  },
  finishWorkout: async (opts) => {
    const { sets, activeSessionKey, sessions, workout } = get();
    const session = sessions[activeSessionKey];
    const durationSec = workout.startedAt ? Math.round((Date.now() - workout.startedAt) / 1000) : workout.seconds;
    const newSets: { exerciseName: string; reps: number; weight: number }[] = [];
    const nextSets = { ...sets };
    (session?.exercises ?? []).forEach((ex) => {
      (sets[ex.id] || []).forEach((row) => {
        if (row.reps > 0 && (row.done || opts?.includeUnchecked)) newSets.push({ exerciseName: ex.name, reps: row.reps, weight: row.weight });
      });
      nextSets[ex.id] = []; // saved sets are history now, not "today's sets"
    });
    const date = Date.now();
    const localId = `local-${date}`;
    const record: WorkoutLogRecord = { id: localId, sessionKey: activeSessionKey, date, durationSec, sets: newSets };
    set((s) => {
      const base = { workout: { active: false, seconds: 0, startedAt: null }, restTimer: { ...s.restTimer, status: 'idle' as const }, workoutSnapshotCounts: null, sets: nextSets };
      if (newSets.length === 0) return base;
      const workoutLogs = [record, ...s.workoutLogs];
      const workoutSummary: WorkoutSummaryData = {
        kind: 'strength',
        title: 'Strength Workout',
        startedAt: workout.startedAt ?? date - durationSec * 1000,
        endedAt: date,
        durationSec,
        distanceKm: null,
        route: null,
        maxSpeedKmh: null,
        estCalories: null,
        sets: newSets.length,
        exercises: new Set(newSets.map((r) => r.exerciseName)).size,
        volumeKg: newSets.reduce((n, r) => n + r.weight * r.reps, 0),
        exerciseSets: groupSetsByExercise(newSets),
      };
      return { ...base, workoutLogs, activities: buildActivities(workoutLogs, s.cardio), sessions: withPreviousWeights(s.sessions, workoutLogs), workoutSummary };
    });
    if (newSets.length === 0) return { ok: true };
    try {
      const saved = await saveWorkoutLog(activeSessionKey, newSets, { durationSec, date: new Date(date).toISOString() });
      set((s) => {
        const workoutLogs = s.workoutLogs.map((l) => (l.id === localId ? workoutLogFromResponse(saved) : l));
        return { workoutLogs, activities: buildActivities(workoutLogs, s.cardio) };
      });
      return { ok: true };
    } catch (err) {
      set((s) => ({ pendingLogs: [...s.pendingLogs, { sessionKey: activeSessionKey, sets: newSets, durationSec, date, localId }] }));
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to save workout.' };
    }
  },
  restTimer: { ...REST_TIMER_DEFAULT },
  selectRestPreset: (seconds) => {
    if (get().restTimer.status === 'running') return; // change duration only when idle/paused
    set((s) => ({ restTimer: { ...s.restTimer, duration: seconds, remaining: seconds, customOpen: false } }));
  },
  openCustomRest: () => {
    if (get().restTimer.status === 'running') return;
    set((s) => ({ restTimer: { ...s.restTimer, customOpen: true } }));
  },
  adjustRestTimer: (delta) =>
    set((s) => {
      const duration = Math.max(15, s.restTimer.duration + delta);
      const remaining = s.restTimer.status !== 'running' ? duration : s.restTimer.remaining;
      return { restTimer: { ...s.restTimer, duration, remaining } };
    }),
  startRestTimer: () => set((s) => ({ restTimer: { ...s.restTimer, status: 'running' } })),
  pauseRestTimer: () => set((s) => ({ restTimer: { ...s.restTimer, status: 'paused' } })),
  resumeRestTimer: () => set((s) => ({ restTimer: { ...s.restTimer, status: 'running' } })),
  finishRestTimer: () =>
    set((s) => ({ restTimer: { ...s.restTimer, status: 'idle', cycles: s.restTimer.cycles + 1, remaining: s.restTimer.duration } })),
  tickRestTimer: () =>
    set((s) => {
      const remaining = s.restTimer.remaining - 1;
      if (remaining <= 0) {
        return { restTimer: { ...s.restTimer, status: 'idle', cycles: s.restTimer.cycles + 1, remaining: s.restTimer.duration } };
      }
      return { restTimer: { ...s.restTimer, remaining } };
    }),

  exerciseDetailTab: 'sets',
  selectExerciseTab: (id) => set({ exerciseDetailTab: id }),

  sheetOpen: false,
  sheetTab: 'strength',
  openAddSession: () => set({ sheetOpen: true, sheetTab: 'strength' }),
  closeAddSession: () => set({ sheetOpen: false }),

  activityFilter: { range: 'all', type: 'all' },
  filterSheetOpen: null,
  openFilterSheet: (which) => set({ filterSheetOpen: which }),
  closeFilterSheet: () => set({ filterSheetOpen: null }),
  setActivityFilter: (kind, val) =>
    set((s) => ({ activityFilter: { ...s.activityFilter, [kind]: val }, filterSheetOpen: null })),

  runTrackerOpen: false,
  runStatus: 'idle',
  gpsIssue: null,
  countdownVal: 5,
  workoutSummary: null,
  closeWorkoutSummary: () => set({ workoutSummary: null, summaryStartInShare: false }),
  summaryStartInShare: false,
  openWorkoutSummary: (summary, startInShare = false) => set({ workoutSummary: summary, summaryStartInShare: startInShare }),
  runStartedAt: null,
  run: { ...RUN_DEFAULT },
  runSetupOpen: false,
  runType: 'open',
  distanceGoal: 5,
  distanceCustom: false,
  customDistanceVal: 8,
  intervalMeters: 400,
  intervalReps: 6,
  openRunTracker: () => set({ runTrackerOpen: true, runStatus: 'idle', gpsIssue: null, runStartedAt: null, run: { ...RUN_DEFAULT } }),
  closeRunTracker: () => {
    stopRunTracking().catch(() => {}); // best-effort — local state resets regardless
    set({ runTrackerOpen: false, runStatus: 'idle' });
  },
  beginRunCountdown: () => set({ runStatus: 'countdown', countdownVal: 5 }),
  tickCountdown: () =>
    set((s) => {
      const next = s.countdownVal - 1;
      if (next <= 0) {
        // Fire-and-forget: starts the (single, background-capable) GPS
        // subscription once per run. Denying "Always" still leaves
        // foreground tracking working — see startRunTracking's comment.
        startRunTracking()
          .then((ok) => {
            if (!ok) set({ gpsIssue: 'denied' });
          })
          .catch(() => set({ gpsIssue: 'denied' }));
        return { runStatus: 'running', countdownVal: 0, runStartedAt: Date.now() };
      }
      return { countdownVal: next };
    }),
  toggleRunPause: () => set((s) => ({ runStatus: s.runStatus === 'running' ? 'paused' : 'running' })),
  tickRun: () =>
    set((s) => {
      const elapsed = s.run.elapsed + 1;
      let intervalCount = s.run.intervalCount;
      if (s.runType === 'interval') {
        const target = (intervalCount + 1) * s.intervalMeters;
        if (s.run.distance * 1000 >= target && intervalCount < s.intervalReps) intervalCount++;
      }
      return { run: { ...s.run, elapsed, intervalCount } };
    }),
  addRoutePoint: (point) =>
    set((s) => {
      const route = s.run.route;
      const last = route[route.length - 1];
      if (last && !isPlausibleMovement(last, point)) return {}; // bad GPS fix — drop it entirely
      const addedKm = last ? haversineDistanceKm(last, point) : 0;
      const dtHours = last ? (point.timestamp - last.timestamp) / 1000 / 3600 : 0;
      const segmentSpeedKmh = dtHours > 0 ? addedKm / dtHours : 0;
      return {
        run: {
          ...s.run,
          distance: s.run.distance + addedKm,
          route: [...route, point],
          maxSpeedKmh: Math.max(s.run.maxSpeedKmh, segmentSpeedKmh),
        },
      };
    }),
  finishRun: () => {
    const { run } = get();
    stopRunTracking().catch(() => {});
    if (run.distance <= 0) {
      // Nothing was recorded (the overlay confirms with the user before this).
      set({ runTrackerOpen: false, runStatus: 'idle' });
      return;
    }
    const durationMin = run.elapsed / 60;
    const record: CardioRecord = {
      id: `local-${Date.now()}`,
      type: 'running',
      title: DEFAULT_ACTIVITY_TITLE.running,
      date: Date.now(),
      distanceKm: run.distance,
      durationMin,
      route: run.route,
    };
    const endedAt = record.date;
    const workoutSummary: WorkoutSummaryData = {
      kind: 'run',
      title: record.title,
      startedAt: get().runStartedAt ?? endedAt - run.elapsed * 1000,
      endedAt,
      durationSec: run.elapsed,
      distanceKm: run.distance,
      route: run.route,
      maxSpeedKmh: run.maxSpeedKmh,
      estCalories: Math.round(run.distance * 65),
      sets: 0,
      exercises: 0,
      volumeKg: 0,
      exerciseSets: [],
    };
    set((s) => {
      const cardio = [record, ...s.cardio];
      return { cardio, activities: buildActivities(s.workoutLogs, cardio), runTrackerOpen: false, runStatus: 'idle', workoutSummary };
    });
    saveRunActivity({
      type: 'running',
      title: record.title,
      distance: record.distanceKm,
      duration: durationMin.toFixed(2),
      date: new Date(record.date).toISOString(),
      route: run.route,
    })
      .then((saved) =>
        set((s) => {
          const cardio = s.cardio.map((c) => (c.id === record.id ? cardioFromResponse(saved) : c));
          return { cardio, activities: buildActivities(s.workoutLogs, cardio) };
        }),
      )
      .catch(() => set((s) => ({ pendingCardio: [...s.pendingCardio, record] })));
  },
  openRunSetup: () => set({ runSetupOpen: true }),
  closeRunSetup: () => set({ runSetupOpen: false }),
  selectRunType: (t) => {
    set({ runType: t });
    persistSettings({ runType: t });
  },
  selectDistanceGoal: (d) => {
    set({ distanceGoal: d, distanceCustom: false });
    persistSettings({ distanceGoal: d });
  },
  openCustomDistance: () => set((s) => ({ distanceCustom: true, distanceGoal: s.customDistanceVal })),
  adjustCustomDistance: (delta) =>
    set((s) => {
      const customDistanceVal = Math.max(1, Math.min(50, s.customDistanceVal + delta));
      return { customDistanceVal, distanceGoal: customDistanceVal };
    }),
  incIntervalMeters: () => set((s) => ({ intervalMeters: Math.min(2000, s.intervalMeters + 50) })),
  decIntervalMeters: () => set((s) => ({ intervalMeters: Math.max(50, s.intervalMeters - 50) })),
  incIntervalReps: () => set((s) => ({ intervalReps: Math.min(30, s.intervalReps + 1) })),
  decIntervalReps: () => set((s) => ({ intervalReps: Math.max(1, s.intervalReps - 1) })),
  startRunFromSetup: () => {
    get().closeRunSetup();
    get().openRunTracker();
  },
}));

// Captured once at module init — a snapshot of every field's true default
// value, since all state updates above replace (never mutate) objects. Used
// to wipe a signed-out user's local data before a different account signs in
// on the same device, so it can't briefly leak into the new session's UI.
const INITIAL_TRACKER_STATE = useTrackerStore.getState();
export function resetTrackerStore(): void {
  disableProgramSync();
  useTrackerStore.setState(INITIAL_TRACKER_STATE, true);
}
