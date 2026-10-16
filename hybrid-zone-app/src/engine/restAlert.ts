import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';

// "Rest over" feedback for the workout rest timer.
//
// - In the app: the phone vibrates the moment the countdown reaches zero.
// - Phone locked or app in the background: JavaScript isn't running, so a local
//   notification (scheduled for the exact end time when the timer starts) makes
//   the phone buzz instead. It only works if notifications are allowed; the
//   first rest timer asks once through the normal system prompt.

let scheduledId: string | null = null;

export function vibrateRestOver(): void {
  // On iPhone the length is fixed (~0.4s) and the pattern only sets the gaps,
  // so this gives two distinct buzzes; Android follows the pattern exactly.
  Vibration.vibrate([0, 450, 200, 450]);
}

export async function cancelRestOver(): Promise<void> {
  const id = scheduledId;
  scheduledId = null;
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or cleared
  }
}

export async function scheduleRestOver(seconds: number): Promise<void> {
  await cancelRestOver();
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain && perm.status === 'undetermined') {
      perm = await Notifications.requestPermissionsAsync();
    }
    if (!perm.granted) return;
    scheduledId = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over', body: 'Time for your next set.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    // no notification support here — the in-app buzz still works
  }
}
