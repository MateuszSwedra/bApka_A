import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { usersAPI } from './api';

/** Zapisane po zakończeniu naszego kroku zgody (przycisk w modalu lub gdy OS już udzielił zgody). */
export const NOTIFICATION_PROMPT_DONE_KEY = 'bapka_notification_prompt_completed_v1';

export async function setupAndroidPushChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

function resolveExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/** Rejestruje token push na backendzie wyłącznie gdy system już udzielił zgody (bez ponownego pytania). */
export async function syncPushTokenToBackend(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  await setupAndroidPushChannel();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  try {
    const projectId = resolveExpoProjectId();
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})
    ).data;
    await usersAPI.updateFcmToken(token);
  } catch (e) {
    console.warn('Failed to get push token', e);
  }
}

export async function requestOsNotificationPermission(): Promise<Notifications.PermissionStatus> {
  await setupAndroidPushChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}
