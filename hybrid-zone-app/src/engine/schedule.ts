// Pure functions for the weekly training schedule — ported from Onboarding.html's
// `initSchedule`/`incDay`/`decDay`/`tapDay` (lines 311-331), reworked to return new
// objects rather than mutate, since this backs a React/Zustand store.

export type Dow = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Discipline = 'strength' | 'running';

export const DAY_ORDER: Dow[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES: Record<Dow, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

// Deliberately not in weekday order — spaces strength/running sessions out
// (e.g. strength defaults to Mon/Wed/Fri before doubling up).
export const STRENGTH_POOL: Dow[] = ['mon', 'wed', 'fri', 'sun', 'tue', 'thu', 'sat'];
export const RUNNING_POOL: Dow[] = ['tue', 'thu', 'sat', 'sun', 'mon', 'wed', 'fri'];

export interface DayAssignment {
  strength: boolean;
  running: boolean;
}

export type WeekSchedule = Record<Dow, DayAssignment>;

const LEVEL_DAYS: Record<Level, number> = { beginner: 2, intermediate: 3, advanced: 4 };

export function emptyWeek(): WeekSchedule {
  const week = {} as WeekSchedule;
  DAY_ORDER.forEach((d) => {
    week[d] = { strength: false, running: false };
  });
  return week;
}

export function initSchedule(
  strengthExp: Level | null,
  includeRunning: boolean,
  runningExp: Level | null
): WeekSchedule {
  const sN = (strengthExp && LEVEL_DAYS[strengthExp]) || 3;
  const rN = includeRunning ? (runningExp && LEVEL_DAYS[runningExp]) || 3 : 0;
  const week = emptyWeek();
  STRENGTH_POOL.slice(0, sN).forEach((d) => {
    week[d] = { ...week[d], strength: true };
  });
  RUNNING_POOL.slice(0, rN).forEach((d) => {
    week[d] = { ...week[d], running: true };
  });
  return week;
}

export function countDays(week: WeekSchedule, type: Discipline): number {
  return DAY_ORDER.filter((d) => week[d][type]).length;
}

export function incDay(week: WeekSchedule, type: Discipline): WeekSchedule {
  const pool = type === 'strength' ? STRENGTH_POOL : RUNNING_POOL;
  const d = pool.find((day) => !week[day][type]);
  if (!d) return week;
  return { ...week, [d]: { ...week[d], [type]: true } };
}

export function decDay(week: WeekSchedule, type: Discipline): WeekSchedule {
  const pool = [...(type === 'strength' ? STRENGTH_POOL : RUNNING_POOL)].reverse();
  const d = pool.find((day) => week[day][type]);
  if (!d) return week;
  return { ...week, [d]: { ...week[d], [type]: false } };
}

export function tapDay(week: WeekSchedule, day: Dow, mode: Discipline): WeekSchedule {
  return { ...week, [day]: { ...week[day], [mode]: !week[day][mode] } };
}
