import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import type { AppLanguage } from '../i18n/resolveLanguage';
import { resolveDeviceLanguage } from '../i18n/resolveLanguage';

const LANG_KEY = 'bapka_app_language_v1';
export type AppLanguagePreference = AppLanguage | 'system';

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

export function normalizeAppLanguagePreference(raw?: string | null): AppLanguagePreference {
  const code = (raw ?? '').trim().toLowerCase();
  if (code === 'en' || code === 'pl') return code;
  return 'system';
}

export function resolveLanguageFromPreference(preference: AppLanguagePreference): AppLanguage {
  if (preference === 'system') {
    return resolveDeviceLanguage(Localization.getLocales());
  }
  return normalizeAppLanguage(preference);
}

export async function getStoredAppLanguagePreference(): Promise<AppLanguagePreference | null> {
  const raw = await storageGet(LANG_KEY);
  if (!raw) return null;
  return normalizeAppLanguagePreference(raw);
}

export async function setStoredAppLanguagePreference(
  preference: AppLanguagePreference,
): Promise<void> {
  await storageSet(LANG_KEY, preference);
}

export async function getStoredAppLanguage(): Promise<AppLanguage | null> {
  const preference = await getStoredAppLanguagePreference();
  if (!preference) return null;
  return resolveLanguageFromPreference(preference);
}

export async function setStoredAppLanguage(lang: AppLanguage): Promise<void> {
  await setStoredAppLanguagePreference(lang);
}

/** Lokalny wybór > język urządzenia > profil (domyślne `pl` z API nie nadpisuje EN telefonu). */
export async function resolveEffectiveAppLanguage(
  profileLanguage?: string | null,
): Promise<AppLanguage> {
  const storedPreference = await getStoredAppLanguagePreference();
  if (storedPreference) return resolveLanguageFromPreference(storedPreference);

  const device = resolveDeviceLanguage(Localization.getLocales());
  const raw = profileLanguage?.trim();
  if (!raw) return device;

  const profileLang = normalizeAppLanguage(raw);
  if (profileLang === 'pl' && device === 'en') return device;

  return profileLang;
}
