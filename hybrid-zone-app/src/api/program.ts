import { apiFetchJson } from './client';

export interface ProgramExercisePayload {
  name: string;
  group: string;
  sets: number;
  previous: number | null;
}

export interface ProgramSessionPayload {
  key: string;
  day: string;
  duration: number;
  exercises: ProgramExercisePayload[];
}

export interface ProgramRunDayPayload {
  day: string;
  type: string;
  distance: number;
  duration: number;
  pace: string;
  zoneTag: string;
  zoneDetail: string;
  effort: string;
}

export interface ProgramPayload {
  split: string;
  sessions: ProgramSessionPayload[];
  runDays?: ProgramRunDayPayload[] | null;
}

export interface ProgramExerciseResponse extends ProgramExercisePayload {
  id: string;
}

export interface ProgramSessionResponse extends Omit<ProgramSessionPayload, 'exercises'> {
  id: string;
  exercises: ProgramExerciseResponse[];
}

export interface ProgramResponse {
  id: string;
  userId: string;
  split: string;
  sessions: ProgramSessionResponse[];
  runDays: ProgramRunDayPayload[] | null;
}

export async function getProgram(): Promise<ProgramResponse | null> {
  return apiFetchJson<ProgramResponse | null>('/api/program', { method: 'GET' });
}

// Full replace — matches the backend's "client owns the whole program" model.
export async function saveProgram(payload: ProgramPayload): Promise<ProgramResponse> {
  return apiFetchJson<ProgramResponse>('/api/program', { method: 'PUT', body: JSON.stringify(payload) });
}
