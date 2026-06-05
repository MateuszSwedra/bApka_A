import type { ScheduleItem } from '../context/MedsContext';
import { compareYmd, parseYmdLocal } from './ymdDate';

/** ISO weekday (1=Pn ... 7=Nd) z napisu YYYY-MM-DD (lokalna data). */
export function isoWeekdayFromDateString(dateStr: string): number {
  const d = parseYmdLocal(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/** Czy harmonogram obowiązuje w danym dniu. Wspólne dla „Today” i „Kalendarz”. */
export function scheduleAppliesToDate(s: ScheduleItem, dateStr: string): boolean {
  if (s.type === 'ONCE') {
    return s.startDate === dateStr;
  }

  if (compareYmd(dateStr, s.startDate) < 0) return false;

  const dow = isoWeekdayFromDateString(dateStr);
  // Puste daysOfWeek w TEMPORARY znaczy „codziennie w okresie”.
  const everyDay = s.type === 'TEMPORARY' && (!s.daysOfWeek || s.daysOfWeek.length === 0);
  if (!everyDay && !s.daysOfWeek.includes(dow)) return false;

  if (s.type === 'TEMPORARY' && s.endDate) {
    return compareYmd(dateStr, s.endDate) <= 0;
  }
  return true;
}

/** Porównuje czasy „HH:MM” jako minuty od północy. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(n => parseInt(n, 10) || 0);
  return h * 60 + m;
}

/** Liczba tabletek z pola dawki harmonogramu (np. „2” → 2). */
export function parseDosagePills(dosage?: string): number {
  if (!dosage?.trim()) return 1;
  const n = parseInt(dosage.replace(/[^0-9]/g, ''), 10);
  if (!n || n <= 0) return 1;
  return n;
}
