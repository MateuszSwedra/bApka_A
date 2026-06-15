import type { ScheduleItem } from '../context/MedsContext';
import { compareYmd, normalizeYmd, parseYmdLocal } from './ymdDate';

function scheduleYmd(raw?: string | null): string | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  return normalizeYmd(raw) ?? String(raw).trim().slice(0, 10);
}

/** ISO weekday (1=Pn ... 7=Nd) z napisu YYYY-MM-DD (lokalna data). */
export function isoWeekdayFromDateString(dateStr: string): number {
  const d = parseYmdLocal(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/** Czy harmonogram obowiązuje w danym dniu. Wspólne dla „Today” i „Kalendarz”. */
export function scheduleAppliesToDate(s: ScheduleItem, dateStr: string): boolean {
  const scheduleType = String(s.type).toUpperCase();

  if (scheduleType === 'ONCE') {
    const onceDate = scheduleYmd(s.startDate);
    return onceDate === dateStr;
  }

  const startDate = scheduleYmd(s.startDate) || '1970-01-01';
  if (compareYmd(dateStr, startDate) < 0) return false;

  const dow = isoWeekdayFromDateString(dateStr);
  const days = s.daysOfWeek ?? [];
  const everyDay =
    days.length === 0 &&
    (scheduleType === 'TEMPORARY' || scheduleType === 'DAILY' || scheduleType === 'REGULAR');
  if (!everyDay && !days.includes(dow)) return false;

  if (scheduleType === 'TEMPORARY' && s.endDate) {
    const endDate = scheduleYmd(s.endDate);
    if (endDate) return compareYmd(dateStr, endDate) <= 0;
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
