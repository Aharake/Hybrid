// Background run-tracking task. TaskManager.defineTask() MUST run at module
// scope, before the app finishes loading — this file is imported once, for
// its side effect, as the very first import in App.tsx. That's also what
// lets iOS/Android revive the task (and this file) in a headless JS
// instance if the OS fully kills the app while a run is still recording.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useTrackerStore } from '@/store/trackerStore';

export const LOCATION_TASK_NAME = 'hyvo-run-tracking';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data as { locations: Location.LocationObject[] }) ?? {};
  if (!locations?.length) return;

  // The OS subscription stays alive across pause/resume (starting/stopping
  // it is expensive and slow) — whether a point actually counts is decided
  // here, live, against the current run status.
  const store = useTrackerStore.getState();
  if (store.runStatus !== 'running') return;

  locations.forEach((loc) => {
    store.addRoutePoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp });
  });
});

// Apple requires requesting "When In Use" first, and only allows asking for
// "Always" afterward — background recording (screen off / app switched
// away from) needs Always, but foreground-only tracking still works fine
// if the user declines it, so a "no" here isn't a hard failure.
export async function startRunTracking(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  await Location.requestBackgroundPermissionsAsync().catch(() => null);

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (already) return true;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 5,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Hyvo is tracking your run',
      notificationBody: 'Recording your route, distance, and pace.',
    },
  });
  return true;
}

export async function stopRunTracking(): Promise<void> {
  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (already) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
