import { useMemo } from 'react';
import { useTrackerStore } from '@/store/trackerStore';
import { useHealthStore } from '@/store/healthStore';
import { StatsInput, computeMetrics, computeRings, computeAccountStats, MetricBook } from '@/engine/stats';
import { computeFirsts, computeMilestones, computeRecords } from '@/engine/achievements';

// Everything the stats engine reads, gathered from the stores. Recomputed when
// any of it changes (a new workout, a Health sync, a units switch…).
export function useStatsInput(): StatsInput {
  const activities = useTrackerStore((s) => s.activities);
  const workoutLogs = useTrackerStore((s) => s.workoutLogs);
  const sessions = useTrackerStore((s) => s.sessions);
  const runSessions = useTrackerStore((s) => s.runSessions);
  const unitSystem = useTrackerStore((s) => s.unitSystem);
  const health = useHealthStore((s) => s.snapshot);
  return useMemo(
    () => ({ now: Date.now(), activities, workoutLogs, sessions, runSessions, health, unitSystem }),
    [activities, workoutLogs, sessions, runSessions, health, unitSystem],
  );
}

export function useMetrics(): MetricBook {
  const input = useStatsInput();
  return useMemo(() => computeMetrics(input), [input]);
}

export function useRingValues(weekOffset: number) {
  const input = useStatsInput();
  return useMemo(() => computeRings(input, weekOffset), [input, weekOffset]);
}

export function useAccountStats() {
  const input = useStatsInput();
  return useMemo(() => computeAccountStats(input), [input]);
}

export function useAchievements() {
  const activities = useTrackerStore((s) => s.activities);
  return useMemo(
    () => ({ milestones: computeMilestones(activities), records: computeRecords(activities), firsts: computeFirsts(activities) }),
    [activities],
  );
}
