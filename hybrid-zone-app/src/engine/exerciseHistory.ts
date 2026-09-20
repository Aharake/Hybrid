// Exercise history built from the user's real saved workouts: every time
// they logged this exercise, what they lifted. No sample data — an exercise
// that has never been logged has an empty history.
import { clockTime, shortDate } from './dates';
import type { WorkoutLogRecord } from './records';

export interface HistorySet {
  num: number;
  time: string;
  reps: number;
  weight: number; // kg — format with engine/units.ts's fmtWeight at render time
}

export interface HistorySession {
  date: string;
  topWeight: number;
  sets: HistorySet[];
}

// Most recent `limit` sessions, oldest first (so graphs read left to right).
export function buildExerciseHistory(exerciseName: string, logs: WorkoutLogRecord[], limit = 12): HistorySession[] {
  const target = exerciseName.toLowerCase();
  const sessions: HistorySession[] = [];
  [...logs]
    .sort((a, b) => a.date - b.date)
    .forEach((log) => {
      const rows = log.sets.filter((s) => s.exerciseName.toLowerCase() === target);
      if (!rows.length) return;
      sessions.push({
        date: shortDate(log.date),
        topWeight: Math.max(...rows.map((r) => r.weight)),
        sets: rows.map((r, i) => ({ num: i + 1, time: clockTime(log.date), reps: r.reps, weight: r.weight })),
      });
    });
  return sessions.slice(-limit);
}

// Top weight from the exercise's most recent session, or null if it has never been logged.
export function lastLoggedWeight(exerciseName: string, logs: WorkoutLogRecord[]): number | null {
  const history = buildExerciseHistory(exerciseName, logs, 1);
  return history.length ? history[0].topWeight : null;
}

export interface GraphPoint {
  x: number;
  y: number;
  weight: number;
}

export interface ExerciseGraph {
  points: GraphPoint[];
  pathD: string;
  lastWeight: number;
  pctChange: number;
  trendUp: boolean;
  width: number;
  height: number;
}

export function buildExerciseGraph(history: HistorySession[]): ExerciseGraph {
  const weights = history.map((h) => h.topWeight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = Math.max(1, maxW - minW);
  const w = 300;
  const h = 130;
  const padX = 16;
  const padY = 16;
  const stepX = (w - padX * 2) / Math.max(1, history.length - 1);
  const points: GraphPoint[] = history.map((sess, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - (sess.topWeight - minW) / range) * (h - padY * 2),
    weight: sess.topWeight,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const pctChange = firstW > 0 ? Math.round(((lastW - firstW) / firstW) * 100) : 0;
  return { points, pathD, lastWeight: lastW, pctChange, trendUp: pctChange >= 0, width: w, height: h };
}

// Epley formula — an estimate, not a tested max.
export function estimate1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export interface OneRMGraph extends ExerciseGraph {
  best: number;
}

export function build1RMGraph(history: HistorySession[]): OneRMGraph {
  const oneRMs = history.map((sess) => Math.max(...sess.sets.map((set) => estimate1RM(set.weight, set.reps))));
  const minW = Math.min(...oneRMs);
  const maxW = Math.max(...oneRMs);
  const range = Math.max(1, maxW - minW);
  const w = 300;
  const h = 130;
  const padX = 16;
  const padY = 16;
  const stepX = (w - padX * 2) / Math.max(1, history.length - 1);
  const points: GraphPoint[] = oneRMs.map((val, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - (val - minW) / range) * (h - padY * 2),
    weight: val,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const firstRM = oneRMs[0];
  const lastRM = oneRMs[oneRMs.length - 1];
  const best = Math.max(...oneRMs);
  const pctChange = firstRM > 0 ? Math.round(((lastRM - firstRM) / firstRM) * 100) : 0;
  return { points, pathD, lastWeight: lastRM, pctChange, trendUp: pctChange >= 0, width: w, height: h, best };
}
