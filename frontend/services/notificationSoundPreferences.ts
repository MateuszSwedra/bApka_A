import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { NotificationSoundChoiceId } from '../constants/notificationSounds';
import { parseSoundChoiceId } from '../constants/notificationSounds';

const MED_KEY = 'bapka_notif_sound_medication_v1';
const SOS_KEY = 'bapka_notif_sound_sos_v1';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
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
      localStorage.setItem(key, value);
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

export async function getMedicationSoundChoice(): Promise<NotificationSoundChoiceId> {
  const raw = await storageGet(MED_KEY);
  return parseSoundChoiceId(raw);
}

export async function setMedicationSoundChoice(id: NotificationSoundChoiceId): Promise<void> {
  await storageSet(MED_KEY, id);
}

export async function getSosSoundChoice(): Promise<NotificationSoundChoiceId> {
  const raw = await storageGet(SOS_KEY);
  return parseSoundChoiceId(raw);
}

export async function setSosSoundChoice(id: NotificationSoundChoiceId): Promise<void> {
  await storageSet(SOS_KEY, id);
}
