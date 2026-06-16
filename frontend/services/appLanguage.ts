import i18n from '../i18n';
import { syncCalendarLocale } from '../i18n/calendarLocale';
import type { AppLanguage } from '../i18n/resolveLanguage';
import { normalizeAppLanguage, setStoredAppLanguage } from './appLanguageStorage';

export {
  normalizeAppLanguage,
  getStoredAppLanguage,
  resolveEffectiveAppLanguage,
} from './appLanguageStorage';

export async function applyAppLanguage(lang: AppLanguage): Promise<void> {
  await setStoredAppLanguage(lang);
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
  syncCalendarLocale(lang);
}
