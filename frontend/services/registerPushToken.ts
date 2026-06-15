import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { usersAPI, getStoredAuthToken, isAuthApiError } from './api';
import {
  prepareAndroidNotificationChannel,
  requestUserNotificationPermission,
} from './notificationPermissions';

function getEasProjectId(): string | null {
  const id = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Usuwa token push z bieżącego konta (przed wylogowaniem lub zmianą konta). */
export async function clearPushTokenFromBackend(): Promise<void> {
  if (Platform.OS === 'web') return;

  const token = await getStoredAuthToken();
  if (!token) return;

  try {
    await usersAPI.clearFcmToken();
  } catch (e) {
    if (isAuthApiError(e)) return;
    console.warn('Push token clear failed', e);
  }
}

/**
 * Pobiera Expo Push Token i zapisuje go w backendzie (pole fcmToken użytkownika).
 * Wymaga wcześniejszej zgody użytkownika na powiadomienia.
 */
export async function syncPushTokenWithBackend(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await prepareAndroidNotificationChannel();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn('Push token sync skipped: brak EAS projectId');
    return false;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return false;

    let nativePushToken: string | undefined;
    try {
      const device = await Notifications.getDevicePushTokenAsync();
      if (device?.data && typeof device.data === 'string') {
        nativePushToken = device.data;
      }
    } catch {
      /* brak natywnego tokenu — zostaje tylko Expo push */
    }

    await usersAPI.updateFcmToken(token, nativePushToken);
    return true;
  } catch (e) {
    console.warn('Push token sync failed', e);
    return false;
  }
}

/** Dialog systemowy + rejestracja tokenu (ekran onboardingu). */
export async function requestPermissionAndSyncPushToken(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const permission = await requestUserNotificationPermission();
  if (permission.status !== 'granted') return false;

  return syncPushTokenWithBackend();
}
