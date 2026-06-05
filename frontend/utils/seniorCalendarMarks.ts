import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';
import { parseYmdLocal } from './scheduleDateHelpers';
import { scheduleAppliesToDate } from './scheduleHelpers';

export type SimpleCalendarMark = {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
};

/** Mała kropka pod dniem z zaplanowaną aktywnością. */
export function buildActivityDotMarks(
  schedules: ScheduleItem[],
  monthAnchorYmd: string,
  dotColor: string,
): Record<string, SimpleCalendarMark> {
  const monthStart = startOfMonth(parseYmdLocal(monthAnchorYmd));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const marks: Record<string, SimpleCalendarMark> = {};

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (schedules.some(s => scheduleAppliesToDate(s, dateStr))) {
      marks[dateStr] = { marked: true, dotColor };
    }
  }

  return marks;
}
