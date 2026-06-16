import i18n from '../i18n';
import { syncCalendarLocale } from '../i18n/calendarLocale';
import type { AppLanguage } from '../i18n/resolveLanguage';
import {
  normalizeAppLanguage,
  normalizeAppLanguagePreference,
  resolveLanguageFromPreference,
  setStoredAppLanguage,
  setStoredAppLanguagePreference,
  type AppLanguagePreference,
} from './appLanguageStorage';

export {
  normalizeAppLanguage,
  normalizeAppLanguagePreference,
  resolveLanguageFromPreference,
  type AppLanguagePreference,
  getStoredAppLanguage,
  getStoredAppLanguagePreference,
  resolveEffectiveAppLanguage,
} from './appLanguageStorage';

export async function applyAppLanguage(lang: AppLanguage): Promise<void> {
  await setStoredAppLanguage(lang);
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
  syncCalendarLocale(lang);
}

export async function applyAppLanguagePreference(
  preference: AppLanguagePreference,
): Promise<AppLanguage> {
  await setStoredAppLanguagePreference(preference);
  const resolved = resolveLanguageFromPreference(preference);
  if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved);
  }
  syncCalendarLocale(resolved);
  return resolved;
}
