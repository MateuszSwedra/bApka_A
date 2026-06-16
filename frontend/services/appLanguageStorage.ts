import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import type { AppLanguage } from '../i18n/resolveLanguage';
import { resolveDeviceLanguage } from '../i18n/resolveLanguage';

const LANG_KEY = 'bapka_app_language_v1';

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

export function normalizeAppLanguage(raw?: string | null): AppLanguage {
  const code = (raw ?? '').trim().toLowerCase();
  return code === 'en' ? 'en' : 'pl';
}

export async function getStoredAppLanguage(): Promise<AppLanguage | null> {
  const raw = await storageGet(LANG_KEY);
  if (!raw) return null;
  return normalizeAppLanguage(raw);
}

export async function setStoredAppLanguage(lang: AppLanguage): Promise<void> {
  await storageSet(LANG_KEY, lang);
}

/** Lokalny wybór > język urządzenia > profil (domyślne `pl` z API nie nadpisuje EN telefonu). */
export async function resolveEffectiveAppLanguage(
  profileLanguage?: string | null,
): Promise<AppLanguage> {
  const stored = await getStoredAppLanguage();
  if (stored) return stored;

  const device = resolveDeviceLanguage(Localization.getLocales());
  const raw = profileLanguage?.trim();
  if (!raw) return device;

  const profileLang = normalizeAppLanguage(raw);
  if (profileLang === 'pl' && device === 'en') return device;

  return profileLang;
}
