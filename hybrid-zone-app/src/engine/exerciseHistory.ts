// Deterministic per-exercise history — pure port of seededRandom()/
// generateExerciseHistory()/renderExerciseGraph()'s math. Seeded by a string hash
// (not Math.random()), so the same exercise id always produces the same 6-session
// history and graph — not randomized fresh on every render.

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

export function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

// Deterministic per-exercise history generator: same exercise id always produces
// the same 6-session history, with a gentle upward weight trend (older sessions
// lighter) plus natural session-to-session variance.
export function generateExerciseHistory(exId: string, currentWeight: number | null): HistorySession[] {
  const base = currentWeight || 15 + seededRandom(exId + '_base') * 45;
  const sessions: HistorySession[] = [];
  for (let i = 5; i >= 0; i--) {
    const trend = 1 - i * 0.03; // older sessions ~3%/session lighter
    const variance = 0.94 + seededRandom(exId + '_v' + i) * 0.12;
    const sessionWeight = Math.round((base * trend * variance) / 2.5) * 2.5;
    const setCount = 3;
    const sets: HistorySet[] = [];
    for (let s = 0; s < setCount; s++) {
      const repVariance = seededRandom(exId + '_r' + i + '_' + s);
      const reps = 6 + Math.floor(repVariance * 6);
      const setWeight = s === setCount - 1 ? Math.max(2.5, sessionWeight - 2.5) : sessionWeight; // last set often a slight drop-off
      sets.push({ num: s + 1, time: `${7 + s}:0${2 + s * 3} PM`, reps, weight: setWeight });
    }
    const weeksAgo = i;
    sessions.push({
      date: weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`,
      topWeight: sessionWeight,
      sets,
    });
  }
  return sessions;
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
  const stepX = (w - padX * 2) / (history.length - 1);
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
  const oneRMs = history.map((sess) => estimate1RM(sess.sets[0].weight, sess.sets[0].reps));
  const minW = Math.min(...oneRMs);
  const maxW = Math.max(...oneRMs);
  const range = Math.max(1, maxW - minW);
  const w = 300;
  const h = 130;
  const padX = 16;
  const padY = 16;
  const stepX = (w - padX * 2) / (history.length - 1);
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
