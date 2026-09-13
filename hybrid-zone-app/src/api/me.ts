import { apiFetch } from './client';

export async function deleteAccount(): Promise<void> {
  const response = await apiFetch('/api/me', { method: 'DELETE' });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
}
