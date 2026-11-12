import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'bapka_notification_onboarding_done_v1';

async function storageGet(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function storageSet(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, value);
    } catch {
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
  }
}

/** Czy ekran zgody na powiadomienia był już dokończony (akceptacja lub pominięcie). */
export async function hasCompletedNotificationOnboarding(): Promise<boolean> {
  return (await storageGet()) === 'true';
}

/** Oznacz, że użytkownik przeszedł ekran powiadomień — nie pokazuj go ponownie. */
export async function markNotificationOnboardingDone(): Promise<void> {
  await storageSet('true');
}
