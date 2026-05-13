import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DALTONIST_KEY = 'bapka_senior_daltonist_v1';
const HIGH_CONTRAST_KEY = 'bapka_senior_high_contrast_v1';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}

export async function getDaltonistFriendly(): Promise<boolean> {
  const raw = await storageGet(DALTONIST_KEY);
  return raw === '1' || raw === 'true';
}

export async function setDaltonistFriendly(value: boolean): Promise<void> {
  await storageSet(DALTONIST_KEY, value ? '1' : '0');
}

export async function getHighContrast(): Promise<boolean> {
  const raw = await storageGet(HIGH_CONTRAST_KEY);
  return raw === '1' || raw === 'true';
}

export async function setHighContrast(value: boolean): Promise<void> {
  await storageSet(HIGH_CONTRAST_KEY, value ? '1' : '0');
}
