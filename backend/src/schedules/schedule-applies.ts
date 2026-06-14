import { scheduledAtOnLocalDay } from '../common/app-timezone';

export type ScheduleForApply = {
  id: string;
  type: string;
  startDate?: string | null;
  endDate?: string | null;
  daysOfWeek?: number[];
};

function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

function isoWeekdayFromYmd(ymd: string, timeZone: string): number {
  const instant = scheduledAtOnLocalDay('12:00', ymd, timeZone);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(instant);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

/** Zgodne z frontend/utils/scheduleHelpers.ts — czy harmonogram obowiązuje w danym dniu. */
export function scheduleAppliesToDate(
  schedule: ScheduleForApply,
  dateYmd: string,
  timeZone: string,
): boolean {
  if (schedule.type === 'ONCE') {
    return schedule.startDate === dateYmd;
  }

  const startDate = schedule.startDate?.trim() || '1970-01-01';
  if (compareYmd(dateYmd, startDate) < 0) return false;

  const days = schedule.daysOfWeek ?? [];
  const dow = isoWeekdayFromYmd(dateYmd, timeZone);
  const everyDay =
    days.length === 0 &&
    (schedule.type === 'TEMPORARY' || schedule.type === 'DAILY' || schedule.type === 'REGULAR');
  if (!everyDay && !days.includes(dow)) return false;

  if (schedule.type === 'TEMPORARY' && schedule.endDate?.trim()) {
    return compareYmd(dateYmd, schedule.endDate.trim()) <= 0;
  }
  return true;
}
