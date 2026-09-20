import { create } from 'zustand';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  HealthSnapshot,
  healthSourceName,
  isHealthAvailable,
  isHealthPlatformSupported,
  readHealthSnapshot,
  requestHealthAccess,
} from '@/engine/health';

const CONNECTED_KEY = 'hyvo.health.connected';
// Foreground refreshes closer together than this are skipped.
const MIN_REFRESH_GAP_MS = 60_000;

interface HealthStore {
  supported: boolean;
  connected: boolean;
  syncing: boolean;
  error: string | null;
  snapshot: HealthSnapshot | null;
  // Restores the saved "connected" flag on launch, syncs once if it's on, and
  // keeps data fresh whenever the app comes back to the foreground.
  init: () => Promise<void>;
  connect: () => Promise<boolean>;
  // Stops Hyvo reading/showing health data. The OS-level permission itself can
  // only be revoked by the user in Settings, which the UI points them to.
  disconnect: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
}

let initialized = false;

export const useHealthStore = create<HealthStore>((set, get) => ({
  supported: isHealthPlatformSupported,
  connected: false,
  syncing: false,
  error: null,
  snapshot: null,

  init: async () => {
    if (initialized || !isHealthPlatformSupported) return;
    initialized = true;
    const saved = await SecureStore.getItemAsync(CONNECTED_KEY).catch(() => null);
    if (saved === '1') {
      set({ connected: true });
      get().refresh(true);
    }
    AppState.addEventListener('change', (state) => {
      if (state === 'active' && get().connected) get().refresh();
    });
  },

  connect: async () => {
    set({ syncing: true, error: null });
    try {
      if (!(await isHealthAvailable())) {
        set({
          syncing: false,
          error: `${healthSourceName} isn't available on this device. On Android, install or update the Health Connect app first.`,
        });
        return false;
      }
      const ok = await requestHealthAccess();
      if (!ok) {
        set({ syncing: false, error: `Access to ${healthSourceName} wasn't granted.` });
        return false;
      }
      await SecureStore.setItemAsync(CONNECTED_KEY, '1').catch(() => {});
      set({ connected: true });
      await get().refresh(true);
      return true;
    } catch {
      set({ syncing: false, error: `Couldn't connect to ${healthSourceName}. Please try again.` });
      return false;
    }
  },

  disconnect: async () => {
    await SecureStore.deleteItemAsync(CONNECTED_KEY).catch(() => {});
    set({ connected: false, snapshot: null, error: null });
  },

  refresh: async (force = false) => {
    const { connected, syncing, snapshot } = get();
    if (!connected || syncing) return;
    if (!force && snapshot && Date.now() - snapshot.updatedAt < MIN_REFRESH_GAP_MS) return;
    set({ syncing: true, error: null });
    try {
      set({ snapshot: await readHealthSnapshot(), syncing: false });
    } catch {
      set({ syncing: false, error: `Couldn't read from ${healthSourceName}.` });
    }
  },
}));
