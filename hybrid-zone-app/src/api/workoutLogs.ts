import { apiFetchJson } from './client';

export interface WorkoutLogSetPayload {
  exerciseId?: string | null;
  exerciseName: string;
  reps: number;
  weight: number;
}

export async function saveWorkoutLog(sessionKey: string, sets: WorkoutLogSetPayload[]): Promise<void> {
  await apiFetchJson('/api/workout-logs', {
    method: 'POST',
    body: JSON.stringify({ sessionKey, sets }),
  });
}
