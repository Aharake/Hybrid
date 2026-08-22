// Tracker app state (new design) — mirrors the source's `S` object plus its
// module-level mock data (SESSIONS/EXERCISE_POOL/OVERVIEW_METRICS/etc). Unlike the
// old design, SESSIONS' exercises are genuinely mutable at runtime (swap/add/delete),
// so they live in store state rather than as plain exported constants.

import { create } from 'zustand';
import type { DayLabel } from '@/engine/calendar';
import { TODAY_DAY_SHORT, isViewingToday as calendarIsViewingToday } from '@/engine/calendar';

/* ---------------- TYPES ---------------- */

export type SessionKey = 'Push' | 'Pull' | 'Legs' | 'Upper';
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

/* ---------------- STATIC DATA ---------------- */

export const EXERCISE_POOL: Record<MuscleGroupKey, string[]> = {
  Chest: ['Incline DB Press', 'Barbell Bench Press', 'Pec Deck Fly'],
  Back: ['Lat Pulldown', 'T-Bar Row', 'Barbell Row', 'Deadlift', 'Seated Cable Row', 'Single-Arm DB Row'],
  Shoulders: ['Lateral Raises', 'Shoulder Press', 'Barbell Overhead Press'],
  Arms: ['Preacher Curl', 'DB Curl', 'Cable Hammer Curl', 'DB Hammer Curl', 'Dips', 'Cable Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crushers'],
  Legs: ['RDL', 'Barbell Back Squat', 'Leg Press', 'Squat', 'Leg Curl', 'Leg Extension', 'Calf Raises'],
};

const INITIAL_SESSIONS: Record<SessionKey, Session> = {
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

export const ALL_ACTIVITIES: ActivityItem[] = [
  { type: 'strength', title: 'Push Day Strength', meta: 'Strength · 45 min', time: '8:15 AM', daysAgo: 0 },
  { type: 'running', title: 'Outdoor Tempo Run', meta: 'Running · 5.2 km', time: 'Yesterday', daysAgo: 1 },
  { type: 'cycling', title: 'Morning Ride', meta: 'Cycling · 18.4 km', time: '2 days ago', daysAgo: 2 },
  { type: 'swimming', title: 'Pool Laps', meta: 'Swimming · 1,200 m', time: '4 days ago', daysAgo: 4 },
  { type: 'walking', title: 'Evening Walk', meta: 'Walking · 3.1 km', time: '5 days ago', daysAgo: 5 },
  { type: 'strength', title: 'Pull Day Strength', meta: 'Strength · 50 min', time: '6 days ago', daysAgo: 6 },
  { type: 'running', title: 'Long Run', meta: 'Running · 10.1 km', time: '9 days ago', daysAgo: 9 },
  { type: 'other', title: 'Yoga Session', meta: 'Other · 30 min', time: '12 days ago', daysAgo: 12 },
  { type: 'cycling', title: 'Hill Repeats', meta: 'Cycling · 22.0 km', time: '20 days ago', daysAgo: 20 },
  { type: 'strength', title: 'Legs Strength', meta: 'Strength · 55 min', time: '35 days ago', daysAgo: 35 },
  { type: 'swimming', title: 'Open Water Swim', meta: 'Swimming · 1,800 m', time: '50 days ago', daysAgo: 50 },
  { type: 'walking', title: 'Weekend Hike', meta: 'Walking · 8.4 km', time: '100 days ago', daysAgo: 100 },
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

export const RUN_SESSIONS: Partial<Record<DayLabel, RunSessionPlan>> = {
  Tue: { type: 'Easy Run', duration: 35, distance: 5.0, pace: '6\'10"–6\'40"', zoneTag: 'Zone 2 · Recovery', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Conversational pace' },
  Sat: { type: 'Interval Run', duration: 40, distance: 6.0, pace: '4\'50"–5\'10" (work intervals)', zoneTag: 'Zone 4 · VO2 Max', zoneDetail: 'Zone 4-5 (high intensity)', effort: '6 x 400m @ 5K pace, 90s jog recovery' },
};

export const RING_DATA_BASE = { goal: 0.67, consistency: 0.83, volume: 1.12 };

/* ---------------- STORE ---------------- */

interface TrackerStore {
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
  startWorkout: () => void;
  tickWorkout: () => void;
  endWorkout: () => void;
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
  run: { elapsed: number; distance: number; intervalCount: number };
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
const RUN_DEFAULT = { elapsed: 0, distance: 0, intervalCount: 0 };

export const useTrackerStore = create<TrackerStore>((set, get) => ({
  viewWeekOffset: 0,
  viewDay: TODAY_DAY_SHORT,
  selectDay: (weekOffset, label) => set({ viewWeekOffset: weekOffset, viewDay: label }),
  shiftWeek: (delta) => set((s) => ({ viewWeekOffset: s.viewWeekOffset + delta })),
  resetToToday: () => set({ viewWeekOffset: 0, viewDay: TODAY_DAY_SHORT }),
  isViewingToday: () => calendarIsViewingToday(get().viewWeekOffset, get().viewDay),

  sessions: INITIAL_SESSIONS,
  activeSessionKey: 'Push',
  setActiveSessionKey: (key) => set({ activeSessionKey: key }),
  findExerciseById: (id) => {
    const sessions = get().sessions;
    for (const key of Object.keys(sessions) as SessionKey[]) {
      const found = sessions[key].exercises.find((e) => e.id === id);
      if (found) return found;
    }
    return null;
  },

  activeExerciseId: null,
  sets: { ex1: [{ num: 1, weight: 84, reps: 8 }], ex2: [{ num: 1, weight: 43, reps: 10 }], ex3: [], ex4: [] },
  weightInput: '',
  repsInput: '',
  openExercise: (id) => set({ activeExerciseId: id, weightInput: '', repsInput: '' }),
  viewExerciseAnalytics: (id) => set({ activeExerciseId: id, exerciseDetailTab: 'sets' }),
  closeExerciseModal: () => set({ activeExerciseId: null }),
  setWeightInput: (v) => set({ weightInput: v }),
  setRepsInput: (v) => set({ repsInput: v }),
  incWeight: () => set((s) => ({ weightInput: String(Math.max(0, (parseFloat(s.weightInput) || 0) + 2.5)) })),
  decWeight: () => set((s) => ({ weightInput: String(Math.max(0, (parseFloat(s.weightInput) || 0) - 2.5)) })),
  incReps: () => set((s) => ({ repsInput: String(Math.max(0, (parseInt(s.repsInput, 10) || 0) + 1)) })),
  decReps: () => set((s) => ({ repsInput: String(Math.max(0, (parseInt(s.repsInput, 10) || 0) - 1)) })),
  addSet: () => {
    const { activeExerciseId, weightInput, repsInput, sets } = get();
    if (!activeExerciseId || !weightInput || !repsInput) return;
    const list = sets[activeExerciseId] || [];
    const next = [...list, { num: list.length + 1, weight: parseFloat(weightInput), reps: parseInt(repsInput, 10) }];
    set({ sets: { ...sets, [activeExerciseId]: next }, weightInput: '', repsInput: '' });
  },
  updateSet: (exId, idx, field, value) =>
    set((s) => {
      const list = s.sets[exId];
      if (!list || !list[idx]) return {};
      const next = list.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
      return { sets: { ...s.sets, [exId]: next } };
    }),
  removeSet: (exId, idx) =>
    set((s) => ({ sets: { ...s.sets, [exId]: (s.sets[exId] || []).filter((_, i) => i !== idx) } })),
  addSetTo: (exId) =>
    set((s) => {
      const list = s.sets[exId] || [];
      const last = list[list.length - 1];
      const next = [...list, { num: list.length + 1, weight: last ? last.weight : 0, reps: last ? last.reps : 0 }];
      return { sets: { ...s.sets, [exId]: next } };
    }),

  enabled: { home: { ...OVERVIEW_DEFAULTS.home }, strength: { ...OVERVIEW_DEFAULTS.strength }, running: { ...OVERVIEW_DEFAULTS.running } },
  toggleMetric: (context, id) =>
    set((s) => ({ enabled: { ...s.enabled, [context]: { ...s.enabled[context], [id]: !s.enabled[context][id] } } })),
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
  },
  deleteExercise: (sessionKey, exId) =>
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
    }),
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
  },

  workout: { active: false, seconds: 0 },
  startWorkout: () => set({ workout: { active: true, seconds: 0 }, restTimer: { ...REST_TIMER_DEFAULT } }),
  tickWorkout: () => set((s) => ({ workout: { ...s.workout, seconds: s.workout.seconds + 1 } })),
  endWorkout: () => set((s) => ({ workout: { ...s.workout, active: false }, restTimer: { ...s.restTimer, status: 'idle' } })),
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
  closeRunTracker: () => set({ runTrackerOpen: false, runStatus: 'idle' }),
  beginRunCountdown: () => set({ runStatus: 'countdown', countdownVal: 5 }),
  tickCountdown: () =>
    set((s) => {
      const next = s.countdownVal - 1;
      if (next <= 0) return { runStatus: 'running', countdownVal: 0 };
      return { countdownVal: next };
    }),
  toggleRunPause: () => set((s) => ({ runStatus: s.runStatus === 'running' ? 'paused' : 'running' })),
  tickRun: () =>
    set((s) => {
      const elapsed = s.run.elapsed + 1;
      const distance = s.run.distance + 2.9 / 1000;
      let intervalCount = s.run.intervalCount;
      if (s.runType === 'interval') {
        const target = (intervalCount + 1) * s.intervalMeters;
        if (distance * 1000 >= target && intervalCount < s.intervalReps) intervalCount++;
      }
      return { run: { elapsed, distance, intervalCount } };
    }),
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
