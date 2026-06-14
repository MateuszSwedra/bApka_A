import { eachDayOfInterval, format, startOfDay, type Locale } from 'date-fns';
import { parseMood, type MoodValue } from '../constants/moodVisual';
import { formatLocalYmd } from './localCalendarDay';

export type MoodLogRow = { mood: string; createdAt: string };

export type MoodDayCell = {
  dayKey: string;
  dayLabel: string;
  mood: MoodValue | null;
};

/** Jedna buzia na dzień kalendarzowy (ostatni wpis z danego dnia). */
export function buildMoodDayCells(
  items: MoodLogRow[],
  from: Date,
  to: Date,
  locale: Locale,
): MoodDayCell[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() < start.getTime()) return [];

  const logsByDay = new Map<string, MoodLogRow[]>();
  for (const item of items) {
    const created = new Date(item.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = formatLocalYmd(created);
    const bucket = logsByDay.get(key) ?? [];
    bucket.push(item);
    logsByDay.set(key, bucket);
  }

  return eachDayOfInterval({ start, end }).map((date) => {
    const dayKey = formatLocalYmd(date);
    const logs = logsByDay.get(dayKey) ?? [];
    const latest = logs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    return {
      dayKey,
      dayLabel: format(date, 'EEE', { locale }),
      mood: latest ? parseMood(latest.mood) : null,
    };
  });
}
