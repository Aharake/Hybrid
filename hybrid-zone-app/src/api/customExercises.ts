import { apiFetchJson } from './client';

export interface CustomExercisePayload {
  name: string;
  group: string;
}

export interface CustomExerciseResponse extends CustomExercisePayload {
  id: string;
  userId: string;
  createdAt: string;
}

export async function getCustomExercises(): Promise<CustomExerciseResponse[]> {
  return apiFetchJson<CustomExerciseResponse[]>('/api/custom-exercises', { method: 'GET' });
}

export async function saveCustomExercise(payload: CustomExercisePayload): Promise<CustomExerciseResponse> {
  return apiFetchJson<CustomExerciseResponse>('/api/custom-exercises', { method: 'POST', body: JSON.stringify(payload) });
}
