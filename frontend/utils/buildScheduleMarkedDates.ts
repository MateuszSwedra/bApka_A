import { addDays, format } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';
import { scheduleAppliesToDate } from './scheduleHelpers';

/** Kropki w kalendarzu dla dni z zaplanowaną aktywnością (okno ±60 dni od dziś). */
export function buildScheduleMarkedDates(
  schedules: ScheduleItem[],
  dotColor: string,
  windowDays = 60,
): Record<string, { marked: boolean; dotColor: string }> {
  const marks: Record<string, { marked: boolean; dotColor: string }> = {};
  const start = addDays(new Date(), -windowDays);
  const total = windowDays * 2 + 1;

  for (let i = 0; i < total; i++) {
    const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
    if (schedules.some(s => scheduleAppliesToDate(s, dateStr))) {
      marks[dateStr] = { marked: true, dotColor };
    }
  }

  return marks;
}
