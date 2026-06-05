import { LocaleConfig } from 'react-native-calendars';
import pl from './locales/pl.json';
import en from './locales/en.json';

export type AppLanguage = 'pl' | 'en';

type CalendarLocaleStrings = {
  monthNames: string[];
  monthNamesShort: string[];
  dayNames: string[];
  dayNamesShort: string[];
  today: string;
};

function calendarStrings(lang: AppLanguage): CalendarLocaleStrings {
  const c = (lang === 'pl' ? pl : en).calendar;
  return {
    monthNames: c.monthNames,
    monthNamesShort: c.monthNamesShort,
    dayNames: c.dayNames,
    dayNamesShort: c.dayNamesShort,
    today: c.today,
  };
}

/** Synchronizuje react-native-calendars z językiem aplikacji. */
export function syncCalendarLocale(lang: AppLanguage): void {
  const strings = calendarStrings(lang);
  LocaleConfig.locales[lang] = strings;
  LocaleConfig.defaultLocale = lang;
}
