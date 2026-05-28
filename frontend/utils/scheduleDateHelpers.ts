import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { Theme } from '../constants/theme';

export const WEEKDAY_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

/** yyyy-MM-dd → data w lokalnej strefie (unika błędów parseISO / UTC). */
export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function compareYmd(a: string, b: string): number {
  return parseYmdLocal(a).getTime() - parseYmdLocal(b).getTime();
}

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
