import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
  type Locale,
} from 'date-fns';
import { pl as dateFnsPl } from 'date-fns/locale';

/** Liczba dni w widoku planu (dziś + kolejne dni). */
export const SENIOR_PLAN_DAY_COUNT = 7;

/** Pierwszy dzień okna planu — zawsze od podanej daty (zwykle dziś). */
export function startOfSeniorPlanWindow(date: Date): Date {
  return startOfDay(date);
}

/** @deprecated Użyj startOfSeniorPlanWindow — zachowane dla kompatybilności importów. */
export function startOfSeniorWeek(date: Date): Date {
  return startOfSeniorPlanWindow(date);
}

/** Dziś i kolejne 6 dni od kotwicy (łącznie 7 dni). */
export function daysInSeniorWeek(planStart: Date): Date[] {
  const start = startOfSeniorPlanWindow(planStart);
  const end = addDays(start, SENIOR_PLAN_DAY_COUNT - 1);
  return eachDayOfInterval({ start, end });
}

export function shiftSeniorWeek(planStart: Date, deltaPeriods: number): Date {
  return addDays(startOfSeniorPlanWindow(planStart), deltaPeriods * SENIOR_PLAN_DAY_COUNT);
}

/** Czy widoczne okno zaczyna się od dzisiaj. */
export function isCurrentSeniorWeek(planStart: Date, now = new Date()): boolean {
  return isSameDay(startOfSeniorPlanWindow(planStart), startOfDay(now));
}

/** Np. „28.05–3.06.2026” — zawsze po polsku (date-fns locale). */
export function formatSeniorWeekRange(planStart: Date, locale: Locale = dateFnsPl): string {
  const days = daysInSeniorWeek(planStart);
  const first = days[0];
  const last = days[days.length - 1];
  if (first.getMonth() === last.getMonth()) {
    return `${format(first, 'd')}–${format(last, 'd.MM.yyyy', { locale })}`;
  }
  return `${format(first, 'd.MM', { locale })} – ${format(last, 'd.MM.yyyy', { locale })}`;
}

/** ISO weekday 1–7 (Pn–Nd) dla date-fns getDay. */
export function isoWeekdayFromDate(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
