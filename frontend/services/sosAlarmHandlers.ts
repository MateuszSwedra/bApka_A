import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SOS_ALARM_CHANNEL_ID, sosNotifeeVibrationPattern } from '../constants/sosAlarm';
import { getNotifee } from './notifeeSafe';
import {
  navigateToSosAlarm,
  parseSosPayload,
  presentSosAlarm,
  subscribeSosNavigation,
  type SosAlarmParams,
} from './presentSosAlarm';
import { routeIncomingPush } from './incomingPushRouter';

export { SOS_ALARM_CHANNEL_ID };
export type { SosAlarmParams };
export { navigateToSosAlarm, parseSosPayload, presentSosAlarm };

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export async function ensureSosAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const mod = await getNotifee();
  if (!mod) return;

  const { AndroidImportance, AndroidVisibility } = mod;
  try {
    await mod.default.createChannel({
      id: SOS_ALARM_CHANNEL_ID,
      name: 'Alarm SOS',
      description: 'Pełnoekranowy alarm, gdy podopieczny naciska SOS',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern: sosNotifeeVibrationPattern(),
      sound: 'sos_alert',
      bypassDnd: true,
    });
  } catch {
    /* kanał Expo w notificationPermissions.ts wystarczy jako fallback */
  }
}

function presentFromExpoNotification(notification: Notifications.Notification): void {
  const content = notification.request.content;
  const data = content.data as Record<string, unknown> | undefined;
  const params = parseSosPayload(data);
  if (!params) return;

  presentSosAlarm({
    ...params,
    title:
      content.title ??
      (typeof data?.title === 'string' ? data.title : null) ??
      'SOS!',
    body:
      params.body ||
      content.body ||
      (typeof data?.body === 'string' ? data.body : '') ||
      '',
  });
}

function handleGeneralPushNotification(notification: Notifications.Notification): void {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  if (parseSosPayload(data)) return;
  void routeIncomingPush(data);
}

export function registerSosAlarmHandlers(): () => void {
  if (!isNativeMobile) {
    return () => {};
  }

  const navUnsub = subscribeSosNavigation((params) => {
    navigateToSosAlarm(params);
  });

  let notifeeUnsub: (() => void) | undefined;

  void getNotifee().then((mod) => {
    if (!mod) return;
    const { EventType } = mod;
    notifeeUnsub =     mod.default.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        const params = parseSosPayload(detail.notification?.data as Record<string, unknown> | undefined);
        if (params) navigateToSosAlarm(params);
      }
      if (type === EventType.DELIVERED) {
        const data = detail.notification?.data as Record<string, unknown> | undefined;
        const params = parseSosPayload(data);
        if (params) {
          presentSosAlarm({
            ...params,
            title: detail.notification?.title ?? 'SOS!',
            body: params.body || detail.notification?.body || '',
          });
        }
      }
    });
  });

  const expoResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    if (parseSosPayload(data)) {
      presentFromExpoNotification(response.notification);
      return;
    }
    void routeIncomingPush(data);
  });

  const expoReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    if (parseSosPayload(data)) {
      presentFromExpoNotification(notification);
      return;
    }
    void handleGeneralPushNotification(notification);
  });

  return () => {
    navUnsub();
    notifeeUnsub?.();
    expoResponseSub.remove();
    expoReceivedSub.remove();
  };
}

/** Wywołaj przy starcie aplikacji (cold start z powiadomienia). */
export async function openSosAlarmFromColdStart(): Promise<void> {
  if (!isNativeMobile) return;

  const mod = await getNotifee();
  if (mod) {
    try {
      const initialNotifee = await mod.default.getInitialNotification();
      if (initialNotifee?.notification) {
        const data = initialNotifee.notification.data as Record<string, unknown> | undefined;
        const params = parseSosPayload(data);
        if (params) {
          navigateToSosAlarm({
            ...params,
            body: params.body || initialNotifee.notification.body || '',
          });
          return;
        }
      }

      const displayed = await mod.default.getDisplayedNotifications();
      for (const item of displayed) {
        const data = item.notification?.data as Record<string, unknown> | undefined;
        const params = parseSosPayload(data);
        if (params) {
          navigateToSosAlarm({
            ...params,
            body: params.body || item.notification?.body || '',
          });
          return;
        }
      }
    } catch {
      /* fallback do Expo */
    }
  }

  try {
    const initialExpo = await Notifications.getLastNotificationResponseAsync();
    if (initialExpo) {
      presentFromExpoNotification(initialExpo.notification);
    }
  } catch {
    /* niedostępne na web / starym SDK */
  }
}
