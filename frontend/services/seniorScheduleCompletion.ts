import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const prefix = 'bapka_senior_schedule_done_v1_';

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

function keyForDate(dateStr: string): string {
  return `${prefix}${dateStr}`;
}

export async function getCompletedScheduleIdsForDate(dateStr: string): Promise<string[]> {
  const raw = await storageGet(keyForDate(dateStr));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String);
  } catch {
    return [];
  }
}

export async function markScheduleCompletedForDate(dateStr: string, scheduleId: string): Promise<void> {
  const existing = new Set(await getCompletedScheduleIdsForDate(dateStr));
  existing.add(scheduleId);
  await storageSet(keyForDate(dateStr), JSON.stringify([...existing]));
}
