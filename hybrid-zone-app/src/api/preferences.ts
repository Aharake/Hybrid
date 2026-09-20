import { apiFetchJson } from './client';

// Per-account app settings that should follow the user to a new device.
export interface AppSettings {
  unitSystem?: 'metric' | 'imperial';
  restDuration?: number;
  runType?: 'open' | 'distance' | 'interval';
  distanceGoal?: number;
}

export interface PreferencesPayload {
  enabledMetrics?: Record<string, Record<string, boolean>>;
  settings?: AppSettings;
}

export interface PreferencesResponse {
  id: string;
  userId: string;
  enabledMetrics: Record<string, Record<string, boolean>>;
  settings: AppSettings | null;
}

export async function getPreferences(): Promise<PreferencesResponse | null> {
  return apiFetchJson<PreferencesResponse | null>('/api/preferences', { method: 'GET' });
}

export async function savePreferences(payload: PreferencesPayload): Promise<PreferencesResponse> {
  return apiFetchJson<PreferencesResponse>('/api/preferences', { method: 'PUT', body: JSON.stringify(payload) });
}
