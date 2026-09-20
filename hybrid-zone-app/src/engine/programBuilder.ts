// Turns the onboarding answers into the user's real training program — the
// same sessions/exercise counts the plan-preview screen showed them, filled
// with exercises that fit the equipment they said they have.
import type { RunSessionPlan, Session, SessionExercise } from '@/store/trackerStore';
import { DAY_FULL_MAP, DAY_LABELS, DayLabel } from './calendar';
import { DAY_ORDER, Dow, Level, WeekSchedule } from './schedule';
import { Equipment, RunningGoal, SplitValue, StrengthGoal, getRunningSessionTypes, planSessionLabels, sessionExerciseCount } from './planPreview';
import type { FocusOption } from './split';
import { MuscleGroupKey, deriveMuscleGroups, exercisesFor } from './exerciseLibrary';

const DOW_TO_LABEL: Record<Dow, DayLabel> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

// Which muscle groups a session type trains, in the order the builder fills
// its exercise slots (compound movements for the big groups come first).
const TOKEN_GROUPS: Record<string, MuscleGroupKey[]> = {
  'Full body': ['Legs', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
  Upper: ['Chest', 'Back', 'Shoulders', 'Arms', 'Chest', 'Back'],
  Lower: ['Legs', 'Legs', 'Legs', 'Legs'],
  Push: ['Chest', 'Shoulders', 'Chest', 'Arms', 'Shoulders'],
  Pull: ['Back', 'Back', 'Arms', 'Back'],
  Legs: ['Legs', 'Legs', 'Legs', 'Legs'],
  'Chest+Back': ['Chest', 'Back', 'Chest', 'Back'],
  'Shoulders+Arms': ['Shoulders', 'Arms', 'Shoulders', 'Arms'],
};

export interface ProgramAnswers {
  schedule: WeekSchedule;
  split: SplitValue | null;
  focus: FocusOption | null;
  equipment: Equipment | null;
  strengthGoal: StrengthGoal | null;
  includeRunning: boolean;
  runningGoal: RunningGoal | null;
  runningExp: Level | null;
}

export interface BuiltProgram {
  sessions: Record<string, Session>;
  runSessions: Partial<Record<DayLabel, RunSessionPlan>>;
  split: string;
}

function buildStrengthSession(
  token: string,
  occurrence: number,
  idPrefix: string,
  equipment: Equipment | null,
  goal: StrengthGoal | null,
): Omit<Session, 'day'> {
  const groups = TOKEN_GROUPS[token] ?? TOKEN_GROUPS['Full body'];
  const count = sessionExerciseCount(token, equipment, goal);
  const sets = goal === 'strength' ? 4 : 3;
  const used = new Set<string>();
  const exercises: SessionExercise[] = [];
  for (let k = 0; k < count; k++) {
    const group = groups[k % groups.length];
    const all = exercisesFor(group, equipment);
    let pool = all.filter((n) => !used.has(n));
    if (pool.length === 0) pool = all;
    // A second session of the same type (Upper A / Upper B) starts further
    // down the list, so the two days aren't identical.
    const name = pool[(occurrence * 2) % pool.length];
    used.add(name);
    exercises.push({ id: `${idPrefix}_${k}`, name, group, sets, previous: null });
  }
  return { duration: Math.max(30, exercises.length * 11), muscleGroups: deriveMuscleGroups(exercises), exercises };
}

/* ---------------- running ---------------- */

interface RunTypeSpec {
  zoneTag: string;
  zoneDetail: string;
  effort: string;
  pace: string;
  minutes: number; // typical length for an intermediate runner
  speedKmh: number; // rough plan speed, only used to size the distance target
}

const RUN_TYPE_SPECS: Record<string, RunTypeSpec> = {
  'Easy Run': { zoneTag: 'Zone 2 · Easy', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Conversational pace — you can speak in full sentences', pace: 'Easy · conversational', minutes: 35, speedKmh: 10 },
  'Long Run': { zoneTag: 'Zone 2 · Endurance', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Slow and steady — time on your feet matters more than speed', pace: 'Easy · steady', minutes: 55, speedKmh: 9.5 },
  'Moderate Run': { zoneTag: 'Zone 3 · Steady', zoneDetail: 'Zone 3 (steady state)', effort: 'Comfortably hard — short sentences only', pace: 'Steady · controlled', minutes: 40, speedKmh: 10.5 },
  'Tempo Run': { zoneTag: 'Zone 3-4 · Threshold', zoneDetail: 'Zone 3-4 (lactate threshold)', effort: 'Comfortably hard for the middle block, easy warm-up and cool-down', pace: 'Hard · sustainable', minutes: 40, speedKmh: 11.5 },
  'Interval Run': { zoneTag: 'Zone 4-5 · VO2 Max', zoneDetail: 'Zone 4-5 (high intensity)', effort: 'Hard efforts with easy jog recoveries', pace: 'Hard efforts · easy recoveries', minutes: 35, speedKmh: 11 },
  'Run/Walk Progression': { zoneTag: 'Zone 2 · Beginner', zoneDetail: 'Zone 2 (aerobic base)', effort: 'Alternate running and walking — build up the running portions each week', pace: 'Run/walk intervals', minutes: 30, speedKmh: 7 },
};

const EXP_SCALE: Record<Level, number> = { beginner: 0.75, intermediate: 1, advanced: 1.25 };

export function buildRunPlan(type: string, exp: Level | null): RunSessionPlan {
  const spec = RUN_TYPE_SPECS[type] ?? RUN_TYPE_SPECS['Easy Run'];
  const scale = EXP_SCALE[exp ?? 'beginner'];
  const duration = Math.max(20, Math.round((spec.minutes * scale) / 5) * 5);
  const distance = Math.max(1, Math.round(((duration / 60) * spec.speedKmh * (0.9 + scale * 0.1)) * 2) / 2);
  return { type, duration, distance, pace: spec.pace, zoneTag: spec.zoneTag, zoneDetail: spec.zoneDetail, effort: spec.effort };
}

export function buildRunPlans(days: DayLabel[], goal: RunningGoal | null, exp: Level | null): Partial<Record<DayLabel, RunSessionPlan>> {
  const sorted = [...days].sort((a, b) => DAY_LABELS.indexOf(a) - DAY_LABELS.indexOf(b));
  const types = getRunningSessionTypes(sorted.length, goal ?? 'fun');
  const plans: Partial<Record<DayLabel, RunSessionPlan>> = {};
  sorted.forEach((d, i) => {
    plans[d] = buildRunPlan(types[i] ?? 'Easy Run', exp);
  });
  return plans;
}

/* ---------------- whole program ---------------- */

export function buildProgram(a: ProgramAnswers): BuiltProgram {
  const strengthDays = DAY_ORDER.filter((d) => a.schedule[d].strength);
  const split = a.split ?? 'full_body';
  const { tokens, labels } = planSessionLabels(split, strengthDays.length, a.focus);

  const seen: Record<string, number> = {};
  const sessions: Record<string, Session> = {};
  strengthDays.forEach((dow, i) => {
    const token = tokens[i];
    const occurrence = seen[token] ?? 0;
    seen[token] = occurrence + 1;
    const built = buildStrengthSession(token, occurrence, `p${i}`, a.equipment, a.strengthGoal);
    sessions[labels[i]] = { ...built, day: DAY_FULL_MAP[DOW_TO_LABEL[dow]] };
  });

  const runDays = a.includeRunning ? DAY_ORDER.filter((d) => a.schedule[d].running).map((d) => DOW_TO_LABEL[d]) : [];
  const runSessions = buildRunPlans(runDays, a.runningGoal, a.runningExp);

  return { sessions, runSessions, split };
}
