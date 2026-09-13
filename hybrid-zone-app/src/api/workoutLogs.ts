import { apiFetchJson } from './client';

export interface WorkoutLogSetPayload {
  exerciseId?: string | null;
  exerciseName: string;
  reps: number;
  weight: number;
}

export interface WorkoutLogResponse {
  id: string;
  userId: string;
  trainingSessionId: string | null;
  sessionKey: string;
  date: string;
  loggedSets: (WorkoutLogSetPayload & { id: string })[];
}

export async function saveWorkoutLog(sessionKey: string, sets: WorkoutLogSetPayload[]): Promise<void> {
  await apiFetchJson('/api/workout-logs', {
    method: 'POST',
    body: JSON.stringify({ sessionKey, sets }),
  });
}

export async function getWorkoutLogs(): Promise<WorkoutLogResponse[]> {
  return apiFetchJson<WorkoutLogResponse[]>('/api/workout-logs', { method: 'GET' });
}
