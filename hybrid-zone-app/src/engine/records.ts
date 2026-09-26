// Plain data shapes shared by the store and the engine modules, kept in their
// own file so engine code can use them without importing the store.
import type { RoutePoint } from './gps';
import { daysBetween, relativeWhen } from './dates';
import type { MuscleGroupKey } from './exerciseLibrary';
import { fmtDistance, type UnitSystem } from './units';

export type { MuscleGroupKey };
export type SessionKey = string;
export type ActivityType = 'strength' | 'running' | 'cycling' | 'swimming' | 'walking' | 'other';

export interface SessionExercise {
  id: string;
  name: string;
  group: MuscleGroupKey | 'Custom'; // exercises added via the "Add ..." free-text row get group 'Custom'
  sets: number;
  previous: number | null; // last weight logged for this exercise (kg), null until it's been logged
}

export interface Session {
  day: string;
  duration: number;
  muscleGroups: { name: MuscleGroupKey; current: number; max: number }[];
  exercises: SessionExercise[];
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

// A saved strength workout: what was lifted, and when.
export interface WorkoutLogRecord {
  id: string;
  sessionKey: string;
  date: number; // ms epoch
  durationSec: number | null; // null for logs saved before the timer was recorded
  sets: { exerciseName: string; reps: number; weight: number }[]; // weight in kg
}

// A saved run / ride / swim / walk / other activity.
export interface CardioRecord {
  id: string;
  type: ActivityType;
  title: string;
  date: number; // ms epoch
  distanceKm: number; // 0 when the activity has no distance
  durationMin: number;
  route?: RoutePoint[];
}

export interface ActivityItem {
  type: ActivityType;
  title: string;
  date: number; // ms epoch — "2 days ago" style labels are derived from this at render time
  runStats?: {
    distance: number;
    duration: number;
    calories: number;
    avgSpeed: number;
    maxSpeed: number;
    avgHR?: number; // only present when imported from a health app
    maxHR?: number;
    route?: RoutePoint[]; // present only for runs actually recorded via GPS
  };
  strengthStats?: { duration: number | null; exercises: { name: string; sets: { weight: number; reps: number }[] }[] };
  otherStats?: { duration: number; distance: number | null };
}

export function activityDaysAgo(a: ActivityItem, now: number = Date.now()): number {
  return Math.max(0, daysBetween(a.date, now));
}

export function activityWhen(a: ActivityItem, now: number = Date.now()): string {
  return relativeWhen(a.date, now);
}

const TYPE_LABEL: Record<ActivityType, string> = {
  strength: 'Strength',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  walking: 'Walking',
  other: 'Other',
};

// The grey sub-line under an activity's title, in the viewer's units.
export function activityMeta(a: ActivityItem, unitSystem: UnitSystem): string {
  if (a.runStats) return `Running · ${fmtDistance(a.runStats.distance, unitSystem)}`;
  if (a.strengthStats) {
    const sets = a.strengthStats.exercises.reduce((n, e) => n + e.sets.length, 0);
    return a.strengthStats.duration ? `Strength · ${a.strengthStats.duration} min` : `Strength · ${sets} sets`;
  }
  const label = TYPE_LABEL[a.type];
  if (a.otherStats?.distance) return `${label} · ${fmtDistance(a.otherStats.distance, unitSystem)}`;
  return `${label} · ${a.otherStats?.duration ?? 0} min`;
}

// What the "workout complete" screen shows straight after a run or strength
// workout is finished. Health-app numbers (steps, heart rate, energy) are
// added on the screen itself, from the phone's health store, for the same
// time window.
export interface WorkoutSummaryData {
  kind: 'run' | 'strength';
  title: string;
  startedAt: number; // ms epoch
  endedAt: number; // ms epoch
  durationSec: number; // active time (excludes pauses)
  distanceKm: number | null; // runs only
  route: RoutePoint[] | null; // runs only
  maxSpeedKmh: number | null; // runs only
  estCalories: number | null; // the app's own rough estimate, used only if the health app has no reading
  sets: number; // strength only
  exercises: number; // strength only
  volumeKg: number; // strength only: sum of weight × reps
}
