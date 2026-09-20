// Badges earned from real runs: milestones (how many runs), personal records
// (fastest time over a distance, measured from the GPS route so it doesn't
// matter that the run was longer), and dated "firsts".
import { monthYear } from './dates';
import { haversineDistanceKm, RoutePoint } from './gps';
import type { ActivityItem } from './records';

export interface BadgeItem {
  id: string;
  label: string;
  name: string;
  sub?: string | null; // time (PRs) or date (Firsts) shown under the name
  earned: boolean;
  tier: 'solid' | 'outline' | 'locked';
}

const MILE_KM = 1.609344;

const RECORD_DISTANCES: { id: string; label: string; name: string; km: number }[] = [
  { id: 'pr1mi', label: '1MI', name: 'Fastest Mile', km: MILE_KM },
  { id: 'pr3k', label: '3K', name: 'Fastest 3K', km: 3 },
  { id: 'pr3mi', label: '3MI', name: 'Fastest 3 Mile', km: 3 * MILE_KM },
  { id: 'pr5k', label: '5K', name: 'Fastest 5K', km: 5 },
  { id: 'pr10k', label: '10K', name: 'Fastest 10K', km: 10 },
  { id: 'pr15k', label: '15K', name: 'Fastest 15K', km: 15 },
  { id: 'pr20k', label: '20K', name: 'Fastest 20K', km: 20 },
  { id: 'prhalf', label: 'HALF', name: 'Fastest Half', km: 21.0975 },
];

const FIRST_DISTANCES: { id: string; label: string; name: string; km: number }[] = [
  { id: 'f_run', label: 'RUN', name: 'First Run', km: 0.01 },
  { id: 'f_1mi', label: '1MI', name: 'First Mile', km: MILE_KM },
  { id: 'f_5k', label: '5K', name: 'First 5K', km: 5 },
  { id: 'f_10k', label: '10K', name: 'First 10K', km: 10 },
  { id: 'f_15k', label: '15K', name: 'First 15K', km: 15 },
  { id: 'f_half', label: 'HALF', name: 'First Half', km: 21.0975 },
];

export function fmtDuration(totalSec: number): string {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

// Fastest time (seconds) to cover `targetKm` anywhere along the route — a
// sliding window over the cumulative distance, interpolating the exact
// finish point between GPS fixes.
export function fastestWindowSec(route: RoutePoint[], targetKm: number): number | null {
  if (route.length < 2) return null;
  const cum: number[] = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversineDistanceKm(route[i - 1], route[i]));
  if (cum[cum.length - 1] < targetKm) return null;

  let best = Infinity;
  let j = 0;
  for (let i = 0; i < route.length; i++) {
    if (j < i) j = i;
    while (j < route.length && cum[j] - cum[i] < targetKm) j++;
    if (j >= route.length) break;
    const need = cum[i] + targetKm;
    const seg = cum[j] - cum[j - 1];
    const frac = seg > 0 ? (need - cum[j - 1]) / seg : 0;
    const tEnd = route[j - 1].timestamp + frac * (route[j].timestamp - route[j - 1].timestamp);
    best = Math.min(best, (tEnd - route[i].timestamp) / 1000);
  }
  return Number.isFinite(best) && best > 0 ? best : null;
}

function realRuns(activities: ActivityItem[]): ActivityItem[] {
  return activities.filter((a) => a.type === 'running' && a.runStats && a.runStats.distance > 0);
}

export function computeRecords(activities: ActivityItem[]): BadgeItem[] {
  const runs = realRuns(activities);
  return RECORD_DISTANCES.map((d) => {
    let best: number | null = null;
    for (const r of runs) {
      const route = r.runStats?.route;
      if (!route) continue;
      const t = fastestWindowSec(route, d.km);
      if (t !== null && (best === null || t < best)) best = t;
    }
    return { id: d.id, label: d.label, name: d.name, sub: best !== null ? fmtDuration(best) : null, earned: best !== null, tier: best !== null ? 'outline' : 'locked' };
  });
}

export function computeMilestones(activities: ActivityItem[]): BadgeItem[] {
  const total = realRuns(activities).length;
  return [1, 5, 10, 20, 30, 50, 75, 100, 150, 200].map((n) => ({
    id: 'run' + n,
    label: String(n),
    name: `${n} Run${n === 1 ? '' : 's'}`,
    earned: n <= total,
    tier: n <= total && n >= 50 ? 'solid' : n <= total ? 'outline' : 'locked',
  }));
}

export function computeFirsts(activities: ActivityItem[]): BadgeItem[] {
  const runs = realRuns(activities).sort((a, b) => a.date - b.date);
  return FIRST_DISTANCES.map((d) => {
    const first = runs.find((r) => (r.runStats as NonNullable<ActivityItem['runStats']>).distance >= d.km);
    return {
      id: d.id,
      label: d.label,
      name: d.name,
      sub: first ? monthYear(first.date) : null,
      earned: !!first,
      tier: first ? 'outline' : 'locked',
    };
  });
}
