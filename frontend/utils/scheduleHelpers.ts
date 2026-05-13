import { getDay, isBefore, isSameDay, parseISO } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';

/** ISO weekday (1=Pn ... 7=Nd) z napisu YYYY-MM-DD. */
export function isoWeekdayFromDateString(dateStr: string): number {
  const d = parseISO(dateStr);
  const day = getDay(d);
  return day === 0 ? 7 : day;
}

/** Czy harmonogram obowiązuje w danym dniu. Wspólne dla „Today” i „Kalendarz”. */
export function scheduleAppliesToDate(s: ScheduleItem, dateStr: string): boolean {
  const day = parseISO(dateStr);

  if (s.type === 'ONCE') {
    return s.startDate === dateStr;
  }

  const start = parseISO(s.startDate);
  const afterStart = !isBefore(day, start) || isSameDay(day, start);
  if (!afterStart) return false;

  const dow = isoWeekdayFromDateString(dateStr);
  // Puste daysOfWeek w TEMPORARY znaczy „codziennie w okresie”.
  const everyDay = s.type === 'TEMPORARY' && (!s.daysOfWeek || s.daysOfWeek.length === 0);
  if (!everyDay && !s.daysOfWeek.includes(dow)) return false;

  if (s.type === 'TEMPORARY' && s.endDate) {
    const end = parseISO(s.endDate);
    return !isBefore(end, day) || isSameDay(day, end);
  }
  return true;
}

/** Porównuje czasy „HH:MM” jako minuty od północy. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(n => parseInt(n, 10) || 0);
  return h * 60 + m;
}
