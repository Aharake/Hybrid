import { apiFetch, apiFetchJson } from './client';
import type { RoutePoint } from '@/engine/gps';

export interface RunActivityPayload {
  type: string;
  date?: string;
  distance: number;
  duration: string;
  route?: RoutePoint[] | null;
}

export interface RunActivityResponse extends RunActivityPayload {
  id: string;
  userId: string;
}

export async function getRunActivities(): Promise<RunActivityResponse[]> {
  return apiFetchJson<RunActivityResponse[]>('/api/run-activities', { method: 'GET' });
}

export async function saveRunActivity(payload: RunActivityPayload): Promise<RunActivityResponse> {
  return apiFetchJson<RunActivityResponse>('/api/run-activities', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteRunActivity(id: string): Promise<void> {
  const response = await apiFetch(`/api/run-activities/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
}
