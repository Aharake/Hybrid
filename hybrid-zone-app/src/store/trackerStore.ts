// Tracker app state (new design) — mirrors the source's `S` object plus its
// module-level mock data (SESSIONS/EXERCISE_POOL/OVERVIEW_METRICS/etc). Unlike the
// old design, SESSIONS' exercises are genuinely mutable at runtime (swap/add/delete),
// so they live in store state rather than as plain exported constants.

import { create } from 'zustand';
import type { DayLabel } from '@/engine/calendar';
import { TODAY_DAY_SHORT, DAY_LABELS, DAY_FULL_MAP, FULL_TO_DAY_LABEL, isViewingToday as calendarIsViewingToday } from '@/engine/calendar';
import { saveWorkoutLog } from '@/api/workoutLogs';
import { seededRandom } from '@/engine/exerciseHistory';
import { weightStepFor, weightToKg, fmtDistance, distanceToKm, type UnitSystem } from '@/engine/units';
import { haversineDistanceKm, isPlausibleMovement, RoutePoint } from '@/engine/gps';
import { startRunTracking, stopRunTracking } from '@/engine/locationTask';
import { getProgram, saveProgram, type ProgramPayload } from '@/api/program';
import { getPreferences, savePreferences } from '@/api/preferences';
import { getRunActivities, saveRunActivity, type RunActivityResponse } from '@/api/runActivities';
import { saveCustomExercise } from '@/api/customExercises';

/* ---------------- TYPES ---------------- */

// Widened from a 4-way union to allow custom-named workouts (see
// createCustomSession) to live alongside the 4 built-in preset days.
export type SessionKey = string;
export type PresetSessionKey = 'Push' | 'Pull' | 'Legs' | 'Upper';
export type MuscleGroupKey = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs';
export type ActivityType = 'strength' | 'running' | 'cycling' | 'swimming' | 'walking' | 'other';
export type MetricContext = 'home' | 'strength' | 'running';
export type RunStatus = 'idle' | 'countdown' | 'running' | 'paused';
export type RunType = 'open' | 'distance' | 'interval';

export interface SetEntry {
  num: number;
  weight: number;
  reps: number;
}

export interface SessionExercise {
  id: string;
  name: string;
  group: MuscleGroupKey | 'Custom'; // exercises added via the "Add ..." free-text row get group 'Custom'
  sets: number;
  previous: number | null;
}

export interface Session {
  day: string;
  duration: number;
  muscleGroups: { name: MuscleGroupKey; current: number; max: number }[];
  exercises: SessionExercise[];
}

export interface OverviewMetric {
  id: string;
  label: string;
  value: string | null;
  unit: string;
  icon: string;
  big?: boolean;
  bars?: number[];
}

export interface ActivityItem {
  type: ActivityType;
  title: string;
  meta: string;
  time: string;
  daysAgo: number;
  runStats?: {
    distance: number;
    duration: number;
    calories: number;
    avgSpeed: number;
    maxSpeed: number;
    avgHR?: number; // no wearable integration yet — real GPS runs (finishRun) omit these
    maxHR?: number;
    route?: RoutePoint[]; // present only for runs actually recorded via GPS
  };
  strengthStats?: { duration: number; exercises: { name: string; sets: { weight: number; reps: number }[] }[] };
  otherStats?: { duration: number; distance: number | null };
}

export interface RunSessionPlan {
  type: string;
  duration: number;
  distance: number;
  pace: string;
  zoneTag: string;
  zoneDetail: string;
  effort: string;
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

function deriveMuscleGroups(exercises: SessionExercise[]): { name: MuscleGroupKey; current: number; max: number }[] {
  const groupCounts: Record<string, number> = {};
  exercises.forEach((ex) => {
    groupCounts[ex.group] = (groupCounts[ex.group] || 0) + 1;
  });
  return Object.keys(groupCounts).map((g) => ({
    name: g as MuscleGroupKey,
    current: groupCounts[g],
    max: g === 'Legs' ? 20 : 18,
  }));
}

// Fire-and-forget sync of the whole program (backend owns a full-replace PUT
// model) — called after any action that mutates `sessions`/`runSessions` so a
// relaunch or reinstall can restore the user's program from their account.
function persistProgram(
  sessions: Record<SessionKey, Session>,
  runSessions: Partial<Record<DayLabel, RunSessionPlan>>,
  split: string = 'custom',
): void {
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
  saveProgram(payload).catch(() => {});
}

function formatDaysAgo(daysAgo: number): string {
  if (daysAgo <= 0) return 'Just now';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
}

function runActivityResponseToActivityItem(r: RunActivityResponse): ActivityItem {
  const durationMin = Number(r.duration) || 0;
  const durationHours = durationMin / 60;
  const avgSpeed = durationHours > 0 ? r.distance / durationHours : 0;
  const maxSpeed = (r.route ?? []).reduce((max, point, i, route) => {
    if (i === 0) return max;
    const prev = route[i - 1];
    const dtHours = (point.timestamp - prev.timestamp) / 1000 / 3600;
    if (dtHours <= 0) return max;
    const segKmh = haversineDistanceKm(prev, point) / dtHours;
    return Math.max(max, segKmh);
  }, avgSpeed);
  const daysAgo = r.date ? Math.max(0, Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000)) : 0;
  return {
    type: 'running',
    title: 'Outdoor Run',
    meta: `Running · ${r.distance.toFixed(1)} km`,
    time: formatDaysAgo(daysAgo),
    daysAgo,
    runStats: {
      distance: r.distance,
      duration: durationMin,
      calories: Math.round(r.distance * 65),
      avgSpeed,
      maxSpeed,
      route: r.route ?? undefined,
    },
  };
}

export const EXERCISE_POOL: Record<MuscleGroupKey, string[]> = {
  Chest: ['Incline DB Press', 'Barbell Bench Press', 'Pec Deck Fly'],
  Back: ['Lat Pulldown', 'T-Bar Row', 'Barbell Row', 'Deadlift', 'Seated Cable Row', 'Single-Arm DB Row'],
  Shoulders: ['Lateral Raises', 'Shoulder Press', 'Barbell Overhead Press'],
  Arms: ['Preacher Curl', 'DB Curl', 'Cable Hammer Curl', 'DB Hammer Curl', 'Dips', 'Cable Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crushers'],
  Legs: ['RDL', 'Barbell Back Squat', 'Leg Press', 'Squat', 'Leg Curl', 'Leg Extension', 'Calf Raises'],
};

const INITIAL_SESSIONS: Record<PresetSessionKey, Session> = {
  Push: {
    day: 'Monday',
    duration: 60,
    muscleGroups: [
      { name: 'Chest', current: 6, max: 18 },
      { name: 'Shoulders', current: 5, max: 18 },
      { name: 'Arms', current: 4, max: 18 },
    ],
    exercises: [
      { id: 'ex1', name: 'Incline DB Press', group: 'Chest', sets: 3, previous: 32 },
      { id: 'ex2', name: 'Shoulder Press', group: 'Shoulders', sets: 3, previous: 20 },
      { id: 'ex3', name: 'Pec Deck Fly', group: 'Chest', sets: 3, previous: 25 },
      { id: 'ex4', name: 'Lateral Raises', group: 'Shoulders', sets: 3, previous: 10 },
      { id: 'ex5', name: 'Dips', group: 'Arms', sets: 3, previous: 10 },
    ],
  },
  Pull: {
    day: 'Wednesday',
    duration: 55,
    muscleGroups: [
      { name: 'Back', current: 5, max: 18 },
      { name: 'Arms', current: 4, max: 18 },
    ],
    exercises: [
      { id: 'pull1', name: 'Lat Pulldown', group: 'Back', sets: 3, previous: 55 },
      { id: 'pull2', name: 'T-Bar Row', group: 'Back', sets: 3, previous: 45 },
      { id: 'pull3', name: 'Seated Cable Row', group: 'Back', sets: 3, previous: 40 },
      { id: 'pull4', name: 'Preacher Curl', group: 'Arms', sets: 3, previous: 15 },
      { id: 'pull5', name: 'Cable Hammer Curl', group: 'Arms', sets: 3, previous: 12 },
    ],
  },
  Legs: {
    day: 'Thursday',
    duration: 55,
    muscleGroups: [{ name: 'Legs', current: 8, max: 20 }],
    exercises: [
      { id: 'legs1', name: 'RDL', group: 'Legs', sets: 3, previous: 60 },
      { id: 'legs2', name: 'Leg Press', group: 'Legs', sets: 3, previous: 100 },
      { id: 'legs3', name: 'Leg Curl', group: 'Legs', sets: 3, previous: 35 },
      { id: 'legs4', name: 'Leg Extension', group: 'Legs', sets: 3, previous: 40 },
      { id: 'legs5', name: 'Calf Raises', group: 'Legs', sets: 3, previous: 50 },
    ],
  },
  Upper: {
    day: 'Saturday',
    duration: 65,
    muscleGroups: [
      { name: 'Chest', current: 5, max: 18 },
      { name: 'Back', current: 6, max: 18 },
      { name: 'Shoulders', current: 4, max: 18 },
      { name: 'Arms', current: 3, max: 18 },
    ],
    exercises: [
      { id: 'upper1', name: 'Incline DB Press', group: 'Chest', sets: 3, previous: 30 },
      { id: 'upper2', name: 'Lat Pulldown', group: 'Back', sets: 3, previous: 50 },
      { id: 'upper3', name: 'Shoulder Press', group: 'Shoulders', sets: 3, previous: 18 },
      { id: 'upper4', name: 'Seated Cable Row', group: 'Back', sets: 3, previous: 40 },
      { id: 'upper5', name: 'Lateral Raises', group: 'Shoulders', sets: 3, previous: 8 },
      { id: 'upper6', name: 'Preacher Curl', group: 'Arms', sets: 3, previous: 12 },
      { id: 'upper7', name: 'Dips', group: 'Arms', sets: 3, previous: 8 },
    ],
  },
};

export interface SplitTemplate {
  name: string;
  sessions: Record<string, Omit<Session, 'day'>>;
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
      Push: { duration: 60, muscleGroups: INITIAL_SESSIONS.Push.muscleGroups, exercises: INITIAL_SESSIONS.Push.exercises },
      Pull: { duration: 55, muscleGroups: INITIAL_SESSIONS.Pull.muscleGroups, exercises: INITIAL_SESSIONS.Pull.exercises },
      Legs: { duration: 55, muscleGroups: INITIAL_SESSIONS.Legs.muscleGroups, exercises: INITIAL_SESSIONS.Legs.exercises },
      Upper: { duration: 65, muscleGroups: INITIAL_SESSIONS.Upper.muscleGroups, exercises: INITIAL_SESSIONS.Upper.exercises },
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
    { id: 'burn', label: 'Burn', value: '640', unit: 'kcal', icon: 'burn' },
    { id: 'active', label: 'Active', value: '124', unit: 'min', icon: 'active' },
    { id: 'done', label: 'Done', value: '3', unit: '/5', icon: 'done' },
    { id: 'heartrate', label: 'Heart Rate', value: null, unit: '', icon: 'heartrate', big: true, bars: [30, 55, 40, 70, 50, 65, 45] },
    { id: 'trend', label: 'Weekly Trend', value: null, unit: '', icon: 'trend', big: true, bars: [20, 35, 25, 60, 45, 75, 55] },
    { id: 'steps', label: 'Steps', value: '8,421', unit: '', icon: 'stepsIco' },
    { id: 'sleep', label: 'Sleep', value: '7h 12m', unit: '', icon: 'sleep' },
    { id: 'workouts_month', label: 'Workouts', value: '18', unit: 'this mo', icon: 'done' },
    { id: 'longest_streak', label: 'Longest Streak', value: '12', unit: 'days', icon: 'flameIco' },
    { id: 'active_days', label: 'Active Days', value: '5', unit: '/7', icon: 'active' },
  ],
  strength: [
    { id: 'volume', label: 'Volume', value: '8.2k', unit: 'kg', icon: 'trend' },
    { id: 'logged', label: 'Logged Workouts', value: '12', unit: '', icon: 'done' },
    { id: 'done', label: 'Done', value: null, unit: '', icon: 'done' }, // computed live from today's session
    { id: 'prs', label: 'PRs This Week', value: '3', unit: '', icon: 'trophyIco' },
    { id: 'total_sets', label: 'Total Sets', value: '42', unit: 'this wk', icon: 'layersIco' },
    { id: 'avg_duration', label: 'Avg Duration', value: '52', unit: 'min', icon: 'clock' },
    { id: 'workout_streak', label: 'Workout Streak', value: '6', unit: 'days', icon: 'flameIco' },
    { id: 'main_lift', label: 'Bench Press', value: '+5', unit: 'kg/mo', icon: 'trendUp' },
    { id: 'muscle_groups', label: 'Muscle Groups', value: '6', unit: 'this wk', icon: 'layersIco' },
  ],
  running: [
    { id: 'steps_today', label: 'Steps Today', value: '8,421', unit: '/10k', icon: 'stepsIco' },
    { id: 'weekly_dist', label: 'Weekly Dist.', value: '12.4', unit: 'km', icon: 'runIcoSm' },
    { id: 'avg_pace', label: 'Avg. Pace', value: '5\'12"', unit: '/km', icon: 'paceIco' },
    { id: 'runs_monthly', label: 'Runs Monthly', value: '8', unit: 'total', icon: 'monthIco' },
    { id: 'longest_run', label: 'Longest Run', value: '10.1', unit: 'km', icon: 'trendUp' },
    { id: 'elevation', label: 'Elevation', value: '340', unit: 'm this wk', icon: 'elevation' },
    { id: 'fastest_5k', label: 'Fastest 5K', value: '24:12', unit: '', icon: 'trophyIco' },
    { id: 'run_streak', label: 'Run Streak', value: '3', unit: 'days', icon: 'flameIco' },
  ],
};

export const OVERVIEW_DEFAULTS: Record<MetricContext, Record<string, boolean>> = {
  home: { burn: true, active: true, done: true, heartrate: true, trend: true, steps: false, sleep: false, workouts_month: false, longest_streak: false, active_days: false },
  strength: { volume: true, logged: true, done: true, prs: false, total_sets: false, avg_duration: false, workout_streak: false, main_lift: false, muscle_groups: false },
  running: { steps_today: true, weekly_dist: true, avg_pace: true, runs_monthly: true, longest_run: false, elevation: false, fastest_5k: false, run_streak: false },
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  strength: 'strengthActivityIco',
  running: 'runIcoSm',
  cycling: 'cyclingIco',
  swimming: 'swimIco',
  walking: 'walkIco',
  other: 'otherIco',
};

// Mutable now (Log Activity unshifts a new entry) — read via
// useTrackerStore(s => s.activities), not this export directly.
const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    type: 'strength', title: 'Push Day Strength', meta: 'Strength · 45 min', time: '8:15 AM', daysAgo: 0,
    strengthStats: { duration: 45, exercises: [
      { name: 'Flat Barbell Bench Press', sets: [{ weight: 84, reps: 8 }, { weight: 84, reps: 8 }, { weight: 82, reps: 7 }, { weight: 80, reps: 7 }] },
      { name: 'Overhead Barbell Press', sets: [{ weight: 43, reps: 10 }, { weight: 43, reps: 9 }, { weight: 40, reps: 9 }] },
      { name: 'Incline Dumbbell Fly', sets: [{ weight: 16, reps: 12 }, { weight: 16, reps: 11 }, { weight: 14, reps: 12 }] },
      { name: 'Tricep Overhead Extension', sets: [{ weight: 18, reps: 12 }, { weight: 18, reps: 11 }, { weight: 16, reps: 12 }, { weight: 16, reps: 10 }] },
    ] },
  },
  {
    type: 'running', title: 'Outdoor Tempo Run', meta: 'Running · 5.2 km', time: 'Yesterday', daysAgo: 1,
    runStats: { distance: 5.2, duration: 32, calories: 310, avgSpeed: 9.8, maxSpeed: 14.2, avgHR: 152, maxHR: 171 },
  },
  { type: 'cycling', title: 'Morning Ride', meta: 'Cycling · 18.4 km', time: '2 days ago', daysAgo: 2 },
  { type: 'swimming', title: 'Pool Laps', meta: 'Swimming · 1,200 m', time: '4 days ago', daysAgo: 4 },
  { type: 'walking', title: 'Evening Walk', meta: 'Walking · 3.1 km', time: '5 days ago', daysAgo: 5 },
  {
    type: 'strength', title: 'Pull Day Strength', meta: 'Strength · 50 min', time: '6 days ago', daysAgo: 6,
    strengthStats: { duration: 50, exercises: [
      { name: 'Lat Pulldown', sets: [{ weight: 58, reps: 10 }, { weight: 58, reps: 9 }, { weight: 54, reps: 10 }] },
      { name: 'Barbell Row', sets: [{ weight: 66, reps: 8 }, { weight: 66, reps: 8 }, { weight: 62, reps: 8 }] },
      { name: 'Seated Cable Row', sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 46, reps: 11 }] },
      { name: 'Preacher Curl', sets: [{ weight: 20, reps: 11 }, { weight: 20, reps: 10 }, { weight: 18, reps: 11 }] },
    ] },
  },
  {
    type: 'running', title: 'Long Run', meta: 'Running · 10.1 km', time: '9 days ago', daysAgo: 9,
    runStats: { distance: 10.1, duration: 58, calories: 612, avgSpeed: 10.4, maxSpeed: 15.1, avgHR: 148, maxHR: 168 },
  },
  { type: 'other', title: 'Yoga Session', meta: 'Other · 30 min', time: '12 days ago', daysAgo: 12 },
  { type: 'cycling', title: 'Hill Repeats', meta: 'Cycling · 22.0 km', time: '20 days ago', daysAgo: 20 },
  {
    type: 'strength', title: 'Legs Strength', meta: 'Strength · 55 min', time: '35 days ago', daysAgo: 35,
    strengthStats: { duration: 55, exercises: [
      { name: 'RDL', sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 66, reps: 9 }] },
      { name: 'Leg Press', sets: [{ weight: 120, reps: 10 }, { weight: 120, reps: 10 }, { weight: 110, reps: 11 }] },
      { name: 'Leg Curl', sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 11 }, { weight: 36, reps: 12 }] },
      { name: 'Leg Extension', sets: [{ weight: 45, reps: 12 }, { weight: 45, reps: 12 }, { weight: 42, reps: 12 }] },
      { name: 'Calf Raises', sets: [{ weight: 60, reps: 15 }, { weight: 60, reps: 15 }, { weight: 60, reps: 14 }] },
    ] },
  },
  { type: 'swimming', title: 'Open Water Swim', meta: 'Swimming · 1,800 m', time: '50 days ago', daysAgo: 50 },
  { type: 'walking', title: 'Weekend Hike', meta: 'Walking · 8.4 km', time: '100 days ago', daysAgo: 100 },
];

// Matches the Runs Logged stat shown elsewhere on Account.
const RUNS_LOGGED_TOTAL = 52;

export interface BadgeItem {
  id: string;
  label: string;
  name: string;
  sub?: string | null; // time (PRs) or date (Firsts) shown under the name
  earned: boolean;
  tier: 'solid' | 'outline' | 'locked';
}

// Three badge families sharing one shape language: activity milestones are
// hexes that gain visual weight as they climb (outline -> solid once past
// 50 -> locked/dashed until reached); personal records use the same hex
// shape; firsts are discs, earned once, dated.
export const ACTIVITY_MILESTONES: BadgeItem[] = [1, 5, 10, 20, 30, 50, 75, 100, 150, 200].map((n) => ({
  id: 'run' + n,
  label: String(n),
  name: `${n} Run${n === 1 ? '' : 's'}`,
  earned: n <= RUNS_LOGGED_TOTAL,
  tier: n <= RUNS_LOGGED_TOTAL && n >= 50 ? 'solid' : n <= RUNS_LOGGED_TOTAL ? 'outline' : 'locked',
}));

export const PERSONAL_RECORDS: BadgeItem[] = [
  { id: 'pr1mi', label: '1MI', name: 'Fastest Mile', sub: '6:48' },
  { id: 'pr3k', label: '3K', name: 'Fastest 3K', sub: '12:30' },
  { id: 'pr3mi', label: '3MI', name: 'Fastest 3 Mile', sub: '21:40' },
  { id: 'pr5k', label: '5K', name: 'Fastest 5K', sub: '22:14' },
  { id: 'pr10k', label: '10K', name: 'Fastest 10K', sub: '47:05' },
  { id: 'pr15k', label: '15K', name: 'Fastest 15K', sub: '1:14:20' },
  { id: 'pr20k', label: '20K', name: 'Fastest 20K', sub: '1:41:38' },
  { id: 'prhalf', label: 'HALF', name: 'Fastest Half', sub: '1:48:52' },
].map((p) => ({ ...p, earned: true, tier: 'outline' as const }));

export const FIRSTS: BadgeItem[] = [
  { id: 'f_run', label: 'RUN', name: 'First Run', sub: 'Mar 2026', earned: true },
  { id: 'f_1mi', label: '1MI', name: 'First Mile', sub: 'Mar 2026', earned: true },
  { id: 'f_5k', label: '5K', name: 'First 5K', sub: 'Apr 2026', earned: true },
  { id: 'f_10k', label: '10K', name: 'First 10K', sub: 'Jun 2026', earned: true },
  { id: 'f_15k', label: '15K', name: 'First 15K', sub: 'Aug 2026', earned: true },
  { id: 'f_half', label: 'HALF', name: 'First Half', sub: null, earned: false },
].map((f) => ({ ...f, tier: f.earned ? ('outline' as const) : ('locked' as const) }));

const ACTIVITY_SUMMARY_TABLE: Record<'1m' | '3m' | 'all', { workouts: number; runs: number }> = {
  '1m': { workouts: 14, runs: 8 },
  '3m': { workouts: 41, runs: 23 },
  all: { workouts: 96, runs: 52 },
};

const DATA_HIGHLIGHTS_TABLE: Record<'1m' | '3m' | 'all', { consistency: number; load: number }> = {
  '1m': { consistency: 0.81, load: 1.18 },
  '3m': { consistency: 0.88, load: 1.29 },
  all: { consistency: 0.94, load: 1.42 },
};

export const LOGGABLE_ACTIVITY_TYPES: { id: ActivityType; label: string; defaultTitle: string; hasDistance: boolean }[] = [
  { id: 'cycling', label: 'Cycling', defaultTitle: 'Cycling Session', hasDistance: true },
  { id: 'swimming', label: 'Swimming', defaultTitle: 'Swim Session', hasDistance: true },
  { id: 'walking', label: 'Walking', defaultTitle: 'Walk', hasDistance: true },
  { id: 'other', label: 'Other', defaultTitle: 'Activity', hasDistance: false },
];

export const STRENGTH_WORKOUT_OPTIONS = [
  { name: 'Custom Workout', subtitle: 'Build your own from scratch', isCustom: true },
  { name: 'Push Day', subtitle: 'Chest, Shoulders, Triceps', isCustom: false },
  { name: 'Pull Day', subtitle: 'Back, Biceps', isCustom: false },
  { name: 'Legs Day', subtitle: 'Quads, Hamstrings, Glutes, Calves', isCustom: false },
  { name: 'Upper Day', subtitle: 'Full upper body', isCustom: false },
];

export const METRIC_INFO: Record<'goal' | 'consistency' | 'volume', { title: string; body: string }> = {
  goal: {
    title: 'Weekly Goal',
    body: "The average of your progress across this week's set targets — workouts completed, runs completed, and steps walked — each capped at 100% individually so overachieving one goal can't cover for missing another.",
  },
  consistency: {
    title: 'Consistency',
    body: "How many of your scheduled training days you actually completed this week, out of the total scheduled. Rest days you never had planned don't count against you.",
  },
  volume: {
    title: 'Volume Trend',
    body: "This week's total training volume (weight lifted) compared to last week's, so you can see at a glance whether you're trending up or down. Values over 100% mean you've lifted more than last week.",
  },
};

// Mutable now (Program Editor's "Run Days" can rewrite this) — kept as an
// INITIAL_ constant for the store's default state, same pattern as
// INITIAL_SESSIONS. Consumers read useTrackerStore(s => s.runSessions), not
// this export directly.
const INITIAL_RUN_SESSIONS: Partial<Record<DayLabel, RunSessionPlan>> = {
  Tue: { type: 'Easy Run', duration: 35, distance: 5.0, pace: '6\'10"–6\'40"', zoneTag: 'Zone 2 · Recovery', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Conversational pace' },
  Sat: { type: 'Interval Run', duration: 40, distance: 6.0, pace: '4\'50"–5\'10" (work intervals)', zoneTag: 'Zone 4 · VO2 Max', zoneDetail: 'Zone 4-5 (high intensity)', effort: '6 x 400m @ 5K pace, 90s jog recovery' },
};

export const RING_DATA_BASE = { goal: 0.67, consistency: 0.83, volume: 1.12 };

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
  setProgram: (sessions: Record<SessionKey, Session>, runSessions: Partial<Record<DayLabel, RunSessionPlan>>, split?: string) => void;
  // Pulls Program/Preferences/Run history from the account after sign-in so
  // a returning user (or a reinstall) sees their real data, not fresh defaults.
  hydrateFromBackend: () => Promise<void>;

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
  activeExerciseId: string | null;
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
  addSetTo: (exId: string) => void;

  // overview metric toggles
  enabled: Record<MetricContext, Record<string, boolean>>;
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
  workout: { active: boolean; seconds: number };
  workoutSnapshotCounts: Record<string, number> | null;
  startWorkout: () => void;
  tickWorkout: () => void;
  // Discards any sets logged since startWorkout() and ends the workout.
  cancelWorkout: () => void;
  // Saves sets logged since startWorkout() to the backend and ends the
  // workout. Resolves ok:false (with the local state already ended, sets
  // kept) if the save fails — nothing logged locally is lost, it just
  // didn't sync.
  finishWorkout: () => Promise<{ ok: boolean; error?: string }>;
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
  setUnitSystem: (sys) => set({ unitSystem: sys, unitPickerOpen: false }),
  openUnitPicker: () => set({ unitPickerOpen: true }),
  closeUnitPicker: () => set({ unitPickerOpen: false }),

  viewWeekOffset: 0,
  viewDay: TODAY_DAY_SHORT,
  selectDay: (weekOffset, label) => set({ viewWeekOffset: weekOffset, viewDay: label }),
  shiftWeek: (delta) => set((s) => ({ viewWeekOffset: s.viewWeekOffset + delta })),
  resetToToday: () => set({ viewWeekOffset: 0, viewDay: TODAY_DAY_SHORT }),
  isViewingToday: () => calendarIsViewingToday(get().viewWeekOffset, get().viewDay),

  sessions: INITIAL_SESSIONS,
  activeSessionKey: 'Push',
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

  runSessions: INITIAL_RUN_SESSIONS,
  setProgram: (sessions, runSessions, split) => {
    persistProgram(sessions, runSessions, split);
    set({
      sessions,
      runSessions,
      activeSessionKey: Object.keys(sessions)[0] || '',
      viewWeekOffset: 0,
      viewDay: TODAY_DAY_SHORT,
    });
  },
  hydrateFromBackend: async () => {
    const [programRes, prefsRes, runActivitiesRes] = await Promise.allSettled([getProgram(), getPreferences(), getRunActivities()]);

    if (programRes.status === 'fulfilled' && programRes.value && programRes.value.sessions.length > 0) {
      const p = programRes.value;
      const sessions: Record<SessionKey, Session> = {};
      p.sessions.forEach((s) => {
        const exercises: SessionExercise[] = s.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          group: ex.group as MuscleGroupKey | 'Custom',
          sets: ex.sets,
          previous: ex.previous ?? null,
        }));
        sessions[s.key] = { day: s.day, duration: s.duration, exercises, muscleGroups: deriveMuscleGroups(exercises) };
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
      set({ sessions, runSessions, activeSessionKey: Object.keys(sessions)[0] ?? get().activeSessionKey });
    }

    if (prefsRes.status === 'fulfilled' && prefsRes.value) {
      const enabledMetrics = prefsRes.value.enabledMetrics as Record<MetricContext, Record<string, boolean>>;
      set((s) => ({
        enabled: {
          home: { ...s.enabled.home, ...enabledMetrics.home },
          strength: { ...s.enabled.strength, ...enabledMetrics.strength },
          running: { ...s.enabled.running, ...enabledMetrics.running },
        },
      }));
    }

    if (runActivitiesRes.status === 'fulfilled' && runActivitiesRes.value.length > 0) {
      const runActivities = runActivitiesRes.value.map(runActivityResponseToActivityItem);
      set((s) => ({ activities: [...runActivities, ...s.activities.filter((a) => a.type !== 'running')] }));
    }
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

    const newSessions: Record<SessionKey, Session> = {};
    Object.keys(sourceSessions).forEach((sessName) => {
      const dayShort = pe.dayAssignments[sessName];
      if (!dayShort) return;
      if (isCustom) {
        const exercises = (sourceSessions as Record<string, { exercises: SessionExercise[] }>)[sessName].exercises;
        const muscleGroups = deriveMuscleGroups(exercises);
        newSessions[sessName] = { duration: Math.max(30, exercises.length * 11), muscleGroups, exercises, day: DAY_FULL_MAP[dayShort] };
      } else {
        const tmpl = (sourceSessions as Record<string, Omit<Session, 'day'>>)[sessName];
        newSessions[sessName] = { ...tmpl, day: DAY_FULL_MAP[dayShort] };
      }
    });

    const runTypeCycle = ['Easy Run', 'Tempo Run', 'Long Run'];
    const newRunSessions: Partial<Record<DayLabel, RunSessionPlan>> = {};
    const sortedRunDays = [...pe.runDays].sort((a, b) => DAY_LABELS.indexOf(a) - DAY_LABELS.indexOf(b));
    sortedRunDays.forEach((d, i) => {
      const isFinalHardDay = i === sortedRunDays.length - 1 && sortedRunDays.length > 1;
      newRunSessions[d] = isFinalHardDay
        ? { type: 'Interval Run', distance: 6, duration: 40, pace: '5\'00"/km', zoneTag: 'Zone 4 · VO2 Max', zoneDetail: 'Zone 4-5', effort: 'Intervals' }
        : { type: runTypeCycle[i % runTypeCycle.length], distance: 5 + i * 2, duration: 30 + i * 8, pace: '5\'30"/km', zoneTag: 'Zone 2', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Steady' };
    });

    get().setProgram(newSessions, newRunSessions, pe.splitKey);
    set({ programEdit: null });
  },

  activitySummaryRange: 'all',
  dataHighlightsRange: 'all',
  selectActivitySummaryRange: (range) => set({ activitySummaryRange: range }),
  selectDataHighlightsRange: (range) => set({ dataHighlightsRange: range }),
  getActivitySummaryValues: () => ACTIVITY_SUMMARY_TABLE[get().activitySummaryRange],
  getDataHighlightsValues: () => DATA_HIGHLIGHTS_TABLE[get().dataHighlightsRange],

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
  buildLoggedSetsCsv: () => {
    const { sets, findExerciseById } = get();
    const rows: string[][] = [['Exercise', 'Set', 'Weight (kg)', 'Reps']];
    Object.keys(sets).forEach((exId) => {
      const rows_ = sets[exId] || [];
      if (!rows_.length) return;
      const ex = findExerciseById(exId);
      const name = ex ? ex.name : exId;
      rows_.forEach((s, i) => rows.push([name, String(i + 1), String(s.weight), String(s.reps)]));
    });
    return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  },

  activities: INITIAL_ACTIVITIES,
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
    const { logActivityDuration, logActivityType, logActivityDistance, logActivityTitle, unitSystem, activities } = get();
    const dur = parseFloat(logActivityDuration);
    if (!dur || dur <= 0) return;
    const typeInfo = LOGGABLE_ACTIVITY_TYPES.find((t) => t.id === logActivityType)!;
    const enteredDist = parseFloat(logActivityDistance) || 0;
    const distKm = typeInfo.hasDistance && enteredDist > 0 ? distanceToKm(enteredDist, unitSystem) : 0;
    const title = logActivityTitle.trim() || typeInfo.defaultTitle;
    const meta = distKm > 0 ? `${typeInfo.label} · ${fmtDistance(distKm, unitSystem)}` : `${typeInfo.label} · ${Math.round(dur)} min`;
    set({
      activities: [
        { type: logActivityType, title, meta, time: 'Just now', daysAgo: 0, otherStats: { duration: Math.round(dur), distance: distKm > 0 ? distKm : null } },
        ...activities,
      ],
    });
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
          list.push({ id, name, group, sets: 3, previous: Math.round((15 + seededRandom(id) * 45) / 2.5) * 2.5 });
        }
      });
    });
    return list;
  },
  analyticsSearch: '',
  setAnalyticsSearch: (val) => set({ analyticsSearch: val }),

  activeExerciseId: null,
  sets: { ex1: [{ num: 1, weight: 84, reps: 8 }], ex2: [{ num: 1, weight: 43, reps: 10 }], ex3: [], ex4: [] },
  weightInput: '',
  repsInput: '',
  openExercise: (id) => set({ activeExerciseId: id, weightInput: '', repsInput: '' }),
  viewExerciseAnalytics: (id) => set({ activeExerciseId: id, exerciseDetailTab: 'sets' }),
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
    const list = sets[activeExerciseId] || [];
    const next = [...list, { num: list.length + 1, weight, reps }];
    set({ sets: { ...sets, [activeExerciseId]: next }, weightInput: '', repsInput: '' });
  },
  updateSet: (exId, idx, field, value) =>
    set((s) => {
      const list = s.sets[exId];
      if (!list || !list[idx]) return {};
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
      const next = [...list, { num: list.length + 1, weight: last ? last.weight : 0, reps: last ? last.reps : 0 }];
      return { sets: { ...s.sets, [exId]: next } };
    }),

  enabled: { home: { ...OVERVIEW_DEFAULTS.home }, strength: { ...OVERVIEW_DEFAULTS.strength }, running: { ...OVERVIEW_DEFAULTS.running } },
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
        addExerciseFor: null,
        addExerciseSearch: '',
      };
    });
    persistProgram(get().sessions, get().runSessions);
    if (group === 'Custom') saveCustomExercise({ name, group }).catch(() => {});
  },

  workout: { active: false, seconds: 0 },
  workoutSnapshotCounts: null,
  startWorkout: () => {
    const { activeSessionKey, sessions, sets } = get();
    const snapshot: Record<string, number> = {};
    sessions[activeSessionKey].exercises.forEach((ex) => {
      snapshot[ex.id] = (sets[ex.id] || []).length;
    });
    set({ workout: { active: true, seconds: 0 }, restTimer: { ...REST_TIMER_DEFAULT }, workoutSnapshotCounts: snapshot });
  },
  tickWorkout: () => set((s) => ({ workout: { ...s.workout, seconds: s.workout.seconds + 1 } })),
  cancelWorkout: () => {
    const { workoutSnapshotCounts, sets, activeSessionKey, sessions } = get();
    const nextSets = { ...sets };
    if (workoutSnapshotCounts) {
      sessions[activeSessionKey].exercises.forEach((ex) => {
        const keepCount = workoutSnapshotCounts[ex.id] ?? 0;
        nextSets[ex.id] = (sets[ex.id] || []).slice(0, keepCount);
      });
    }
    set((s) => ({
      sets: nextSets,
      workout: { ...s.workout, active: false },
      restTimer: { ...s.restTimer, status: 'idle' },
      workoutSnapshotCounts: null,
    }));
  },
  finishWorkout: async () => {
    const { workoutSnapshotCounts, sets, activeSessionKey, sessions } = get();
    const session = sessions[activeSessionKey];
    const newSets: { exerciseId: string; exerciseName: string; reps: number; weight: number }[] = [];
    session.exercises.forEach((ex) => {
      const keepCount = workoutSnapshotCounts?.[ex.id] ?? 0;
      (sets[ex.id] || []).slice(keepCount).forEach((row) => {
        newSets.push({ exerciseId: ex.id, exerciseName: ex.name, reps: row.reps, weight: row.weight });
      });
    });
    set((s) => ({
      workout: { ...s.workout, active: false },
      restTimer: { ...s.restTimer, status: 'idle' },
      workoutSnapshotCounts: null,
    }));
    if (newSets.length === 0) return { ok: true };
    try {
      await saveWorkoutLog(activeSessionKey, newSets);
      return { ok: true };
    } catch (err) {
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
  countdownVal: 5,
  run: { ...RUN_DEFAULT },
  runSetupOpen: false,
  runType: 'open',
  distanceGoal: 5,
  distanceCustom: false,
  customDistanceVal: 8,
  intervalMeters: 400,
  intervalReps: 6,
  openRunTracker: () => set({ runTrackerOpen: true, runStatus: 'idle', run: { ...RUN_DEFAULT } }),
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
        startRunTracking().catch(() => {});
        return { runStatus: 'running', countdownVal: 0 };
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
    const { run, activities } = get();
    stopRunTracking().catch(() => {});
    const durationMin = Math.round(run.elapsed / 60);
    const avgSpeedKmh = run.elapsed > 0 ? run.distance / (run.elapsed / 3600) : 0;
    // Rough estimate (no weight/HR sensor to derive it from properly) — ~65 kcal/km is a
    // reasonable flat approximation for an average-effort run, consistent with the rest
    // of this prototype's mock-but-plausible stats.
    const calories = Math.round(run.distance * 65);
    const newActivity: ActivityItem = {
      type: 'running',
      title: 'Outdoor Run',
      meta: `Running · ${run.distance.toFixed(1)} km`,
      time: 'Just now',
      daysAgo: 0,
      runStats: {
        distance: run.distance,
        duration: durationMin,
        calories,
        avgSpeed: avgSpeedKmh,
        maxSpeed: run.maxSpeedKmh,
        route: run.route,
      },
    };
    set({
      activities: run.distance > 0 ? [newActivity, ...activities] : activities,
      runTrackerOpen: false,
      runStatus: 'idle',
    });
    if (run.distance > 0) {
      saveRunActivity({ type: 'running', distance: run.distance, duration: String(durationMin), route: run.route }).catch(() => {});
    }
  },
  openRunSetup: () => set({ runSetupOpen: true }),
  closeRunSetup: () => set({ runSetupOpen: false }),
  selectRunType: (t) => set({ runType: t }),
  selectDistanceGoal: (d) => set({ distanceGoal: d, distanceCustom: false }),
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
  useTrackerStore.setState(INITIAL_TRACKER_STATE, true);
}
