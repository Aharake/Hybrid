import { apiFetch, apiFetchJson } from './client';

export interface WorkoutLogSetPayload {
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
  durationSec: number | null;
  loggedSets: (WorkoutLogSetPayload & { id: string })[];
}

// Exercises are matched by name, not id: the app's local exercise ids aren't
// the server's (the program is re-created on every save), and sending one
// would violate the foreign key and reject the whole workout.
export async function saveWorkoutLog(
  sessionKey: string,
  sets: WorkoutLogSetPayload[],
  extra: { durationSec?: number; date?: string } = {},
): Promise<WorkoutLogResponse> {
  return apiFetchJson<WorkoutLogResponse>('/api/workout-logs', {
    method: 'POST',
    body: JSON.stringify({ sessionKey, sets, ...extra }),
  });
}

export async function getWorkoutLogs(): Promise<WorkoutLogResponse[]> {
  return apiFetchJson<WorkoutLogResponse[]>('/api/workout-logs', { method: 'GET' });
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const response = await apiFetch(`/api/workout-logs/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
}
