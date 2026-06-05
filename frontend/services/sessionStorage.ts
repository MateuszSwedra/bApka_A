import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'userRole';

export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredRole(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(ROLE_KEY) : null;
    }
    return await SecureStore.getItemAsync(ROLE_KEY);
  } catch {
    return null;
  }
}

export async function persistSession(token: string, role?: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    if (role) localStorage.setItem(ROLE_KEY, role);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (role) await SecureStore.setItemAsync(ROLE_KEY, role);
}

export async function clearSessionStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    return;
  }
  for (const key of [TOKEN_KEY, ROLE_KEY] as const) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
}
