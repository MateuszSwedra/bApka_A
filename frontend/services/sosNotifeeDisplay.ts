import type { Notification } from 'expo-notifications';

import { Platform } from 'react-native';

import { SOS_ALARM_CHANNEL_ID, sosNotifeeVibrationPattern } from '../constants/sosAlarm';
import { bringAppToSosAlarm } from './bringAppToSosAlarm';


export type SosDisplayParams = {

  title: string;

  body: string;

  dependentId?: string;

  dependentName?: string;

};



type NotifeeModule = typeof import('@notifee/react-native');



function loadNotifeeSync(): NotifeeModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@notifee/react-native') as NotifeeModule;
  } catch {
    return null;
  }
}

async function ensureSosNotifeeChannel(mod: NotifeeModule): Promise<void> {
  const notifee = mod.default;
  const { AndroidImportance, AndroidVisibility } = mod;
  const vibrationPattern = sosNotifeeVibrationPattern();
  try {
    await notifee.createChannel({
      id: SOS_ALARM_CHANNEL_ID,
      name: 'Alarm SOS',
      description: 'Alarm gdy podopieczny naciska SOS',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern,
      sound: 'sos_alert',
      bypassDnd: true,
    });
  } catch {
    await notifee.createChannel({
      id: SOS_ALARM_CHANNEL_ID,
      name: 'Alarm SOS',
      description: 'Alarm gdy podopieczny naciska SOS',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      sound: 'sos_alert',
      bypassDnd: true,
    });
  }
}

function sanitizeNotifeePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const vibrationPattern = sosNotifeeVibrationPattern();
  const android = payload.android;
  if (android && typeof android === 'object') {
    return {
      ...payload,
      android: {
        ...(android as Record<string, unknown>),
        vibrationPattern,
      },
    };
  }
  return payload;
}

/** Wyświetla gotowy payload Notifee z FCM (backend → JSON.stringify). */
export async function displayNotifeeFcmPayload(raw: string): Promise<boolean> {
  const mod = loadNotifeeSync();
  if (!mod) return false;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    await ensureSosNotifeeChannel(mod);
    await mod.default.displayNotification(
      sanitizeNotifeePayload(parsed) as Parameters<typeof mod.default.displayNotification>[0],
    );
    return true;
  } catch (error) {
    console.warn('[SOS] Notifee FCM payload display failed', error);
    const params = sosParamsFromFcmNotifeeJson(raw);
    if (!params) return false;
    return displaySosFullScreenNotification(params);
  }
}

/** Pełnoekranowe powiadomienie SOS (Notifee) — tło / zablokowany ekran. */

export async function displaySosFullScreenNotification(params: SosDisplayParams): Promise<boolean> {

  const mod = loadNotifeeSync();

  if (!mod) return displaySosExpoFallback(params);



  const notifee = mod.default;

  const { AndroidImportance, AndroidCategory, AndroidVisibility } = mod;

  const vibrationPattern = sosNotifeeVibrationPattern();



  try {

    await ensureSosNotifeeChannel(mod);



    await notifee.displayNotification({

      id: `sos-${Date.now()}`,

      title: params.title,

      body: params.body,

      data: {

        type: 'sos',

        dependentId: params.dependentId ?? '',

        dependentName: params.dependentName ?? '',

        body: params.body,

        screen: 'sos-alarm',

      },

      android: {

        channelId: SOS_ALARM_CHANNEL_ID,

        category: AndroidCategory.ALARM,

        importance: AndroidImportance.HIGH,

        visibility: AndroidVisibility.PUBLIC,

        lightUpScreen: true,

        loopSound: true,

        ongoing: true,

        autoCancel: false,

        sound: 'sos_alert',

        vibrationPattern,

        fullScreenAction: { id: 'default' },

        pressAction: { id: 'default', launchActivity: 'default' },

        actions: [

          {

            title: 'Otwórz',

            pressAction: { id: 'open', launchActivity: 'default' },

          },

        ],

      },

    });

    return true;

  } catch (error) {

    console.warn('[SOS] Notifee display failed', error);

    return displaySosExpoFallback(params);

  }

}



async function displaySosExpoFallback(params: SosDisplayParams): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'sos_alert',
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: SOS_ALARM_CHANNEL_ID,
        data: {
          type: 'sos',
          title: params.title,
          body: params.body,
          dependentId: params.dependentId ?? '',
          dependentName: params.dependentName ?? '',
          screen: 'sos-alarm',
        },
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.warn('[SOS] Expo fallback notification failed', error);
    return false;
  }
}



/** Otwiera ekran alarmu przez deep link — fallback gdy FSI wyłączone. */
export async function openSosAlarmDeepLink(params: SosDisplayParams): Promise<void> {
  await bringAppToSosAlarm(params);
}


/** Tło / headless JS — Notifee + opcjonalny deep link. Zwraca true gdy Notifee się wyświetlił. */
const BG_DEDUPE_MS = 4000;
let lastBgKey = '';
let lastBgAt = 0;

export async function presentSosInBackground(params: SosDisplayParams): Promise<boolean> {
  const key = `${params.dependentId ?? ''}:${params.body}`;
  const now = Date.now();
  if (key === lastBgKey && now - lastBgAt < BG_DEDUPE_MS) return true;
  lastBgKey = key;
  lastBgAt = now;

  // Ekran włączony: najpierw wybudź apkę na pełnoekranowy alarm.
  await bringAppToSosAlarm(params);

  // Ekran wygaszony / zablokowany: Notifee fullScreenAction jako backup.
  const shown = await displaySosFullScreenNotification(params);
  return shown;
}


function readSosData(raw: unknown): Record<string, unknown> | null {

  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  if (obj.type === 'sos') return obj;

  if (obj.data && typeof obj.data === 'object') {

    const nested = obj.data as Record<string, unknown>;

    if (nested.type === 'sos') return nested;

  }

  const request = obj.request as { content?: { data?: unknown } } | undefined;

  const fromRequest = request?.content?.data;

  if (fromRequest && typeof fromRequest === 'object') {

    const reqData = fromRequest as Record<string, unknown>;

    if (reqData.type === 'sos') return reqData;

  }

  return null;

}



/** Obsługuje pełny obiekt Notification oraz luźny payload z background task. */

export function sosParamsFromExpoNotification(

  notification: Notification | Record<string, unknown> | null | undefined,

): SosDisplayParams | null {

  if (!notification || typeof notification !== 'object') return null;



  const data = readSosData(notification);

  if (!data) return null;



  const typed = notification as Notification;

  const content = typed.request?.content;

  const loose = notification as Record<string, unknown>;



  const title =

    (typeof content?.title === 'string' ? content.title : null) ??

    (typeof data.title === 'string' ? data.title : null) ??

    (typeof loose.title === 'string' ? loose.title : null) ??

    'SOS!';

  const body =

    (typeof content?.body === 'string' && content.body.trim() ? content.body : null) ??

    (typeof data.body === 'string' && data.body.trim() ? data.body : null) ??

    (typeof loose.body === 'string' && loose.body.trim() ? loose.body : null) ??

    (typeof data.dependentName === 'string' && data.dependentName.trim()
      ? `${data.dependentName} nacisnął(a) przycisk SOS!`
      : 'Podopieczny nacisnął przycisk SOS!');



  return {

    title,

    body,

    dependentId: typeof data.dependentId === 'string' ? data.dependentId : '',

    dependentName: typeof data.dependentName === 'string' ? data.dependentName : '',

  };

}



export function sosParamsFromFcmNotifeeJson(raw: string): SosDisplayParams | null {

  try {

    const payload = JSON.parse(raw) as {

      title?: string;

      body?: string;

      data?: Record<string, unknown>;

    };

    const data = payload.data ?? {};

    if (data.type !== 'sos') return null;

    return {

      title: payload.title ?? 'SOS!',

      body:
        payload.body ??
        (typeof data.dependentName === 'string' && data.dependentName.trim()
          ? `${data.dependentName} nacisnął(a) przycisk SOS!`
          : 'Podopieczny nacisnął przycisk SOS!'),

      dependentId: typeof data.dependentId === 'string' ? data.dependentId : '',

      dependentName: typeof data.dependentName === 'string' ? data.dependentName : '',

    };

  } catch {

    return null;

  }

}


