import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = 'https://hybrid-production-29ef.up.railway.app';

export const AUTH_TOKEN_KEY = 'hybrid_zone_auth_token';

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

// Thin fetch wrapper: resolves relative paths against the API, attaches the
// stored bearer token (Better Auth's `bearer` plugin — React Native has no
// cookie jar, so cookie-based sessions don't work here), and always sets
// Content-Type for JSON bodies.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getStoredToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.formErrors?.[0] ?? body?.message ?? body?.error ?? message;
    } catch {
      // response wasn't JSON — keep the default message
    }
    throw new Error(typeof message === 'string' ? message : `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
