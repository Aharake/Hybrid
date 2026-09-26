import { create } from 'zustand';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  HealthSnapshot,
  HEALTH_PERMISSION_VERSION,
  healthSourceName,
  isHealthAvailable,
  isHealthPlatformSupported,
  readHealthSnapshot,
  requestHealthAccess,
} from '@/engine/health';

const CONNECTED_KEY = 'hyvo.health.connected';
const PROMPTED_KEY = 'hyvo.health.prompted';
const PERMISSION_VERSION_KEY = 'hyvo.health.permVersion';
// Refreshes closer together than this are skipped.
const MIN_REFRESH_GAP_MS = 60_000;
// While the app is open, re-read this often so the Home tiles keep up on their own.
const AUTO_REFRESH_MS = 65_000;

interface HealthStore {
  supported: boolean;
  connected: boolean;
  syncing: boolean;
  error: string | null;
  snapshot: HealthSnapshot | null;
  // True once the saved "already asked" flag has been read, so the first-run
  // prompt never flashes up for someone who has already answered it.
  promptReady: boolean;
  prompted: boolean;
  markPrompted: () => void;
  // Restores the saved "connected" flag on launch, syncs once if it's on, and
  // keeps data fresh whenever the app comes back to the foreground and every
  // minute or so while it stays open.
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
  promptReady: false,
  prompted: false,
  markPrompted: () => {
    set({ prompted: true });
    SecureStore.setItemAsync(PROMPTED_KEY, '1').catch(() => {});
  },

  init: async () => {
    if (initialized || !isHealthPlatformSupported) return;
    initialized = true;
    const saved = await SecureStore.getItemAsync(CONNECTED_KEY).catch(() => null);
    const prompted = await SecureStore.getItemAsync(PROMPTED_KEY).catch(() => null);
    set({ prompted: prompted === '1' || saved === '1', promptReady: true });
    if (saved === '1') {
      set({ connected: true });
      // A newer build reads one more kind of data: ask again, once, so it's covered.
      const permVersion = await SecureStore.getItemAsync(PERMISSION_VERSION_KEY).catch(() => null);
      if (permVersion !== HEALTH_PERMISSION_VERSION) {
        await requestHealthAccess().catch(() => false);
        await SecureStore.setItemAsync(PERMISSION_VERSION_KEY, HEALTH_PERMISSION_VERSION).catch(() => {});
      }
      get().refresh(true);
    }
    AppState.addEventListener('change', (state) => {
      if (state === 'active' && get().connected) get().refresh();
    });
    // Keep the numbers fresh while the app stays open, without the person
    // having to leave and come back.
    setInterval(() => {
      if (AppState.currentState === 'active' && get().connected) get().refresh();
    }, AUTO_REFRESH_MS);
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
      await SecureStore.setItemAsync(PERMISSION_VERSION_KEY, HEALTH_PERMISSION_VERSION).catch(() => {});
      set({ connected: true, prompted: true });
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
