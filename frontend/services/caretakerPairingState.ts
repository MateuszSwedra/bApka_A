import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'requiresCaretakerPairing_v1';

export async function setRequiresCaretakerPairing(required: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    if (required) localStorage.setItem(KEY, 'true');
    else localStorage.removeItem(KEY);
    return;
  }
  if (required) {
    await SecureStore.setItemAsync(KEY, 'true');
  } else {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      /* ignore */
    }
  }
}

export async function getRequiresCaretakerPairing(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(KEY) === 'true';
    }
    return (await SecureStore.getItemAsync(KEY)) === 'true';
  } catch {
    return false;
  }
}
