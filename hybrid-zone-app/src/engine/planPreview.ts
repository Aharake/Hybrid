// Plan-preview row builder — ported verbatim from Onboarding.html lines 476-552
// (SESSION_EXERCISE_COUNT / BW_EXERCISE_COUNT / RUNNING_ZONE / RUNNING_MIX /
// getSessionTypesForSplit / getRunningSessionTypes / suffixLabels / buildPlanRows),
// reworked to take explicit params instead of reading a global `S` object.

import { DAY_ORDER, WeekSchedule } from './schedule';
import { FocusOption, getRecommendation } from './split';

export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';
export type StrengthGoal = 'general' | 'strength' | 'muscle' | 'tone';
export type RunningGoal = 'first5k' | 'fun' | 'faster' | 'further';
export type SplitValue = 'full_body' | 'upper_lower' | 'ppl' | 'custom';

const SESSION_EXERCISE_COUNT: Record<string, number> = {
  'Full body': 5,
  Upper: 6,
  Lower: 4,
  Push: 5,
  Pull: 4,
  Legs: 4,
  'Chest+Back': 4,
  'Shoulders+Arms': 4,
};

// Bodyweight only supports Full body / Upper / Lower (no PPL/Arnold).
// Counts are goal-specific: Build Muscle runs more exercises at higher reps,
// Strength/General trims to the mains, Tone & Lose Fat is a circuit (not a flat count).
const BW_EXERCISE_COUNT: Record<'strength' | 'muscle', Record<string, number>> = {
  strength: { Upper: 4, Lower: 3, 'Full body': 4 },
  muscle: { Upper: 6, Lower: 5, 'Full body': 5 },
};

function strengthSessionSub(rawToken: string, equipment: Equipment | null, strengthGoal: StrengthGoal | null): string {
  if (equipment === 'bodyweight') {
    if (strengthGoal === 'tone') return '4-exercise circuit · 3-4 rounds';
    const bucket: 'muscle' | 'strength' = strengthGoal === 'muscle' ? 'muscle' : 'strength';
    const n = BW_EXERCISE_COUNT[bucket][rawToken] || 4;
    return n + ' exercises';
  }
  return (SESSION_EXERCISE_COUNT[rawToken] || 5) + ' exercises';
}

const RUNNING_ZONE: Record<string, string> = {
  'Easy Run': 'Zone 2-3',
  'Long Run': 'Zone 2-3',
  'Moderate Run': 'Zone 2-3',
  'Interval Run': 'Zone 4-5',
  'Tempo Run': 'Zone 3-4',
  'Run/Walk Progression': 'Beginner run/walk',
};

const RUNNING_MIX: Record<'faster' | 'further', Record<number, string[]>> = {
  faster: {
    1: ['Interval Run'],
    2: ['Interval Run', 'Easy Run'],
    3: ['Easy Run', 'Long Run', 'Interval Run'],
    4: ['Easy Run', 'Long Run', 'Interval Run', 'Tempo Run'],
    5: ['Easy Run', 'Long Run', 'Interval Run', 'Tempo Run', 'Easy Run'],
    6: ['Easy Run', 'Long Run', 'Interval Run', 'Tempo Run', 'Easy Run', 'Easy Run'],
  },
  further: {
    1: ['Long Run'],
    2: ['Long Run', 'Easy Run'],
    3: ['Long Run', 'Easy Run', 'Easy Run'],
    4: ['Long Run', 'Easy Run', 'Easy Run', 'Moderate Run'],
    5: ['Long Run', 'Easy Run', 'Easy Run', 'Moderate Run', 'Easy Run'],
    6: ['Long Run', 'Easy Run', 'Easy Run', 'Moderate Run', 'Easy Run', 'Moderate Run'],
  },
};

function getSessionTypesForSplit(splitValue: SplitValue, sN: number, focus: FocusOption | null): string[] {
  if (sN <= 0) return [];
  if (splitValue === 'full_body') return Array(sN).fill('Full body');
  if (splitValue === 'upper_lower') {
    const a: string[] = [];
    for (let i = 0; i < sN; i++) a.push(i % 2 === 0 ? 'Upper' : 'Lower');
    return a;
  }
  if (splitValue === 'ppl') {
    const cyc = ['Push', 'Pull', 'Legs'];
    const a: string[] = [];
    for (let i = 0; i < sN; i++) a.push(cyc[i % 3]);
    return a;
  }
  return getRecommendation(sN, focus).tokens; // 'custom' (and fallback)
}

function getRunningSessionTypes(rN: number, goal: RunningGoal | null): string[] {
  if (rN <= 0) return [];
  if (goal === 'first5k') return Array(rN).fill('Run/Walk Progression');
  if (goal === 'fun') return Array(rN).fill('Easy Run');
  const table = goal === 'faster' ? RUNNING_MIX.faster : RUNNING_MIX.further;
  return table[Math.max(1, Math.min(6, rN))] || Array(rN).fill('Easy Run');
}

function suffixLabels(tokens: string[]): string[] {
  const counts: Record<string, number> = {};
  tokens.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  const seen: Record<string, number> = {};
  return tokens.map((t) => {
    if (counts[t] <= 1) return t;
    seen[t] = (seen[t] || 0) + 1;
    return t + ' ' + String.fromCharCode(64 + seen[t]);
  });
}

export interface PlanRow {
  title: string;
  sub: string;
}

export function buildPlanRows(params: {
  schedule: WeekSchedule;
  split: SplitValue;
  focus: FocusOption | null;
  equipment: Equipment | null;
  strengthGoal: StrengthGoal | null;
  runningGoal: RunningGoal | null;
}): PlanRow[] {
  const { schedule, split, focus, equipment, strengthGoal, runningGoal } = params;
  const strengthDays = DAY_ORDER.filter((d) => schedule[d].strength);
  const runningDaysArr = DAY_ORDER.filter((d) => schedule[d].running);
  const rawS = getSessionTypesForSplit(split, strengthDays.length, focus);
  const labelsS = suffixLabels(rawS);
  const labelsR = getRunningSessionTypes(runningDaysArr.length, runningGoal);

  const rows: PlanRow[] = [];
  let si = 0;
  let ri = 0;
  DAY_ORDER.forEach((d) => {
    const c = schedule[d];
    if (c.strength) {
      rows.push({ title: labelsS[si] || 'Strength', sub: strengthSessionSub(rawS[si], equipment, strengthGoal) });
      si++;
    }
    if (c.running) {
      const t = labelsR[ri] || 'Run';
      rows.push({ title: t, sub: RUNNING_ZONE[t] || '' });
      ri++;
    }
  });
  return rows;
}
