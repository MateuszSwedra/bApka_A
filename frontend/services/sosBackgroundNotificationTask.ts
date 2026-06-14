import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { presentSosInBackground, sosParamsFromExpoNotification } from './sosNotifeeDisplay';
import { isNotifeeNativeLinked } from './notifeeSafe';
import { bringAppToSosAlarm } from './bringAppToSosAlarm';

export const SOS_BACKGROUND_NOTIFICATION_TASK = 'SOS_BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(SOS_BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  try {
    if (error || Platform.OS !== 'android') return;

    const payload = (data ?? {}) as Record<string, unknown>;
    const notification =
      payload.notification ??
      payload.data ??
      payload;

    const typed = notification as Notifications.Notification;
    const params = sosParamsFromExpoNotification(
      notification as Notifications.Notification | Record<string, unknown>,
    );
    if (!params) return;

    const filled = {
      ...params,
      title: params.title?.trim() || 'SOS!',
      body:
        params.body?.trim() ||
        (params.dependentName
          ? `${params.dependentName} nacisnął(a) przycisk SOS!`
          : 'Podopieczny nacisnął przycisk SOS!'),
    };

    if (isNotifeeNativeLinked()) {
      await presentSosInBackground(filled);
    } else {
      await bringAppToSosAlarm(filled);
    }

    const notifId = typed?.request?.identifier;
    if (notifId) {
      try {
        await Notifications.dismissNotificationAsync(notifId);
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn('[SOS] Background notification task failed', e);
  }
});

export async function registerSosBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const registered = await TaskManager.isTaskRegisteredAsync(SOS_BACKGROUND_NOTIFICATION_TASK);
    if (!registered) {
      await Notifications.registerTaskAsync(SOS_BACKGROUND_NOTIFICATION_TASK);
    }
  } catch {
    /* brak wsparcia w dev build — ignoruj */
  }
}
