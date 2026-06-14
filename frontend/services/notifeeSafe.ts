import { NativeModules, Platform } from 'react-native';

type NotifeeModule = typeof import('@notifee/react-native');

let cached: NotifeeModule | null | undefined;

export function isNotifeeNativeLinked(): boolean {
  if (Platform.OS === 'web') return false;
  return NativeModules.NotifeeApiModule != null;
}

/** Notifee wymaga dev build z natywnym modułem — zwraca null w starym APK / bez prebuild. */
export async function getNotifee(): Promise<NotifeeModule | null> {
  if (cached !== undefined) return cached;
  if (!isNotifeeNativeLinked()) {
    cached = null;
    return null;
  }
  try {
    cached = await import('@notifee/react-native');
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export async function cancelAllNotifeeNotifications(): Promise<void> {
  const mod = await getNotifee();
  if (!mod) return;
  try {
    await mod.default.cancelAllNotifications();
  } catch {
    /* ignore */
  }
}
