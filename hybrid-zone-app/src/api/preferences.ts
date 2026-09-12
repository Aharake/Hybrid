import { apiFetchJson } from './client';

export interface PreferencesPayload {
  enabledMetrics: Record<string, Record<string, boolean>>;
}

export interface PreferencesResponse extends PreferencesPayload {
  id: string;
  userId: string;
}

export async function getPreferences(): Promise<PreferencesResponse | null> {
  return apiFetchJson<PreferencesResponse | null>('/api/preferences', { method: 'GET' });
}

export async function savePreferences(payload: PreferencesPayload): Promise<PreferencesResponse> {
  return apiFetchJson<PreferencesResponse>('/api/preferences', { method: 'PUT', body: JSON.stringify(payload) });
}
