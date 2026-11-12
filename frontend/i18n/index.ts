import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import pl from './locales/pl.json';
import en from './locales/en.json';
import { syncCalendarLocale } from './calendarLocale';
import { resolveDeviceLanguage, type AppLanguage } from './resolveLanguage';
import {
  getStoredAppLanguagePreference,
  resolveLanguageFromPreference,
  setStoredAppLanguagePreference,
} from '../services/appLanguageStorage';

const SUPPORTED: AppLanguage[] = ['pl', 'en'];
const deviceLng = resolveDeviceLanguage(Localization.getLocales());

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng: deviceLng,
  fallbackLng: 'pl',
  supportedLngs: [...SUPPORTED],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

void (async () => {
  const storedPreference = await getStoredAppLanguagePreference();
  // Pierwsze uruchomienie / nowe urządzenie: język systemu (pl|en), inaczej PL.
  // Stare „system” migrujemy do konkretnego pl/en — w UI nie ma już tej opcji.
  const lng = storedPreference
    ? resolveLanguageFromPreference(storedPreference)
    : resolveDeviceLanguage(Localization.getLocales());
  if (!storedPreference || storedPreference === 'system') {
    await setStoredAppLanguagePreference(lng);
  }
  if (i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }
  syncCalendarLocale(lng);
})();

syncCalendarLocale(deviceLng);

export default i18n;
