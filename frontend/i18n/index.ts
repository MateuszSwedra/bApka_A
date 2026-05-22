import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import pl from './locales/pl.json';
import en from './locales/en.json';
import { syncCalendarLocale } from './calendarLocale';
import { resolveDeviceLanguage, type AppLanguage } from './resolveLanguage';

const SUPPORTED: AppLanguage[] = ['pl', 'en'];
const lng = resolveDeviceLanguage(Localization.getLocales());

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng,
  fallbackLng: 'pl',
  supportedLngs: [...SUPPORTED],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

syncCalendarLocale(lng);

export default i18n;
