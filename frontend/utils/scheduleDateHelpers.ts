import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { Theme } from '../constants/theme';

export { parseYmdLocal, compareYmd } from './ymdDate';
import { compareYmd, parseYmdLocal } from './ymdDate';

export const WEEKDAY_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

export function parseDaysOfWeekParam(raw?: string): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map(n => parseInt(n, 10))
    .filter(n => n >= 1 && n <= 7);
}

export function buildTempRangeMarks(tempStart: string, tempEnd: string): Record<string, Record<string, unknown>> {
  const marks: Record<string, Record<string, unknown>> = {};
  const start = parseYmdLocal(tempStart);
  const end = parseYmdLocal(tempEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return marks;

  const span = differenceInCalendarDays(end, start);
  if (span < 0) return marks;

  const middleColor = 'rgba(233, 164, 61, 0.35)';
  const edgeColor = Theme.colors.accentOrange;

  for (let i = 0; i <= span; i += 1) {
    const d = format(addDays(start, i), 'yyyy-MM-dd');
    const isFirst = i === 0;
    const isLast = i === span;
    const mark: Record<string, unknown> = {
      color: isFirst || isLast ? edgeColor : middleColor,
    };
    if (isFirst) mark.startingDay = true;
    if (isLast) mark.endingDay = true;
    if (isFirst || isLast) {
      mark.textColor = Theme.colors.surfaceWhite;
    }
    marks[d] = mark;
  }
  return marks;
}

/** Czy data + godzina (bez strefy) jest już w przeszłości względem teraz. */
export function isScheduleDateTimeInPast(
  dateYmd: string,
  hour: number,
  minute: number,
): boolean {
  const d = parseYmdLocal(dateYmd);
  d.setHours(hour, minute, 0, 0);
  return d.getTime() < Date.now();
}

/** Minimalna dozwolona godzina przy planowaniu na dany dzień (undefined = bez limitu). */
export function getMinScheduleTimeForDate(
  dateYmd: string,
): { hour: number; minute: number } | undefined {
  const now = new Date();
  const todayYmd = format(now, 'yyyy-MM-dd');
  if (compareYmd(dateYmd, todayYmd) < 0) {
    return { hour: 23, minute: 59 };
  }
  if (compareYmd(dateYmd, todayYmd) > 0) {
    return undefined;
  }
  return { hour: now.getHours(), minute: now.getMinutes() };
}

export function isTimeBeforeMin(
  hour: number,
  minute: number,
  min: { hour: number; minute: number },
): boolean {
  return hour < min.hour || (hour === min.hour && minute < min.minute);
}

/** Czy cały dzień kalendarza jest w przeszłości. */
export function isCalendarDayInPast(dateYmd: string): boolean {
  const todayYmd = format(new Date(), 'yyyy-MM-dd');
  return compareYmd(dateYmd, todayYmd) < 0;
}

/** Czy wpis harmonogramu (data + HH:MM) jest w przeszłości. */
export function isScheduleItemInPast(dateYmd: string, timeHm: string): boolean {
  const [h, m] = timeHm.split(':').map(n => parseInt(n, 10) || 0);
  return isScheduleDateTimeInPast(dateYmd, h, m);
}

/** Czy slot godzinowy w widoku dnia jest w przeszłości (pełna godzina). */
export function isCalendarHourSlotInPast(dateYmd: string, hour: number): boolean {
  const now = new Date();
  const todayYmd = format(now, 'yyyy-MM-dd');
  if (compareYmd(dateYmd, todayYmd) < 0) return true;
  if (compareYmd(dateYmd, todayYmd) > 0) return false;
  return hour < now.getHours();
}

export const addMedCalendarTheme = {
  backgroundColor: Theme.colors.background,
  calendarBackground: Theme.colors.background,
  textSectionTitleColor: Theme.colors.textLight,
  selectedDayBackgroundColor: Theme.colors.primaryLimeDark,
  selectedDayTextColor: Theme.colors.surfaceWhite,
  todayTextColor: Theme.colors.accentOrange,
  dayTextColor: Theme.colors.textDark,
  textDisabledColor: Theme.colors.border,
  arrowColor: Theme.colors.textDark,
  monthTextColor: Theme.colors.textDark,
  textDayFontWeight: '500' as const,
  textMonthFontWeight: 'bold' as const,
  textDayHeaderFontWeight: '600' as const,
};
