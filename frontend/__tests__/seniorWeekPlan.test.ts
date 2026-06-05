import { addDays, format, startOfDay } from 'date-fns';
import {
  formatSeniorWeekRange,
  daysInSeniorWeek,
  shiftSeniorWeek,
  startOfSeniorPlanWindow,
} from '../utils/seniorWeekPlan';

describe('seniorWeekPlan', () => {
  it('returns 7 days starting from anchor (today + 6)', () => {
    const anchor = startOfSeniorPlanWindow(new Date('2026-05-28T12:00:00'));
    const days = daysInSeniorWeek(anchor);
    expect(days).toHaveLength(7);
    expect(format(days[0], 'yyyy-MM-dd')).toBe('2026-05-28');
    expect(format(days[6], 'yyyy-MM-dd')).toBe('2026-06-03');
  });

  it('formats plan range', () => {
    const anchor = startOfSeniorPlanWindow(new Date('2026-05-20T12:00:00'));
    expect(formatSeniorWeekRange(anchor)).toBe('20–26.05.2026');
  });

  it('shifts by 7-day periods', () => {
    const anchor = startOfSeniorPlanWindow(new Date('2026-05-26T12:00:00'));
    const next = shiftSeniorWeek(anchor, 1);
    const days = daysInSeniorWeek(next);
    expect(format(days[0], 'yyyy-MM-dd')).toBe(format(addDays(anchor, 7), 'yyyy-MM-dd'));
  });

  it('anchor is start of day', () => {
    const anchor = startOfSeniorPlanWindow(new Date('2026-05-28T23:59:00'));
    expect(anchor).toEqual(startOfDay(new Date('2026-05-28T23:59:00')));
  });
});
