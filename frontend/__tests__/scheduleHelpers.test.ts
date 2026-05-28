import type { ScheduleItem } from '../context/MedsContext';
import {
  isoWeekdayFromDateString,
  scheduleAppliesToDate,
  timeToMinutes,
  parseDosagePills,
} from '../utils/scheduleHelpers';

function sched(partial: Partial<ScheduleItem> & Pick<ScheduleItem, 'type' | 'startDate'>): ScheduleItem {
  return {
    id: '1',
    time: '08:00',
    daysOfWeek: [],
    dosage: '1',
    ...partial,
  } as ScheduleItem;
}

describe('scheduleHelpers', () => {
  describe('isoWeekdayFromDateString', () => {
    it('maps Monday to 1', () => {
      expect(isoWeekdayFromDateString('2026-05-18')).toBe(1);
    });

    it('maps Sunday to 7', () => {
      expect(isoWeekdayFromDateString('2026-05-17')).toBe(7);
    });
  });

  describe('scheduleAppliesToDate', () => {
    it('ONCE only on startDate', () => {
      const s = sched({ type: 'ONCE', startDate: '2026-05-20' });
      expect(scheduleAppliesToDate(s, '2026-05-20')).toBe(true);
      expect(scheduleAppliesToDate(s, '2026-05-21')).toBe(false);
    });

    it('REGULAR respects daysOfWeek', () => {
      const s = sched({
        type: 'REGULAR',
        startDate: '2026-05-01',
        daysOfWeek: [1],
      });
      expect(scheduleAppliesToDate(s, '2026-05-18')).toBe(true);
      expect(scheduleAppliesToDate(s, '2026-05-19')).toBe(false);
    });

    it('TEMPORARY with empty daysOfWeek applies every day in range', () => {
      const s = sched({
        type: 'TEMPORARY',
        startDate: '2026-05-10',
        endDate: '2026-05-12',
        daysOfWeek: [],
      });
      expect(scheduleAppliesToDate(s, '2026-05-11')).toBe(true);
      expect(scheduleAppliesToDate(s, '2026-05-13')).toBe(false);
    });
  });

  describe('timeToMinutes', () => {
    it('parses HH:MM', () => {
      expect(timeToMinutes('08:30')).toBe(510);
      expect(timeToMinutes('00:00')).toBe(0);
    });
  });

  describe('parseDosagePills', () => {
    it('defaults to 1', () => {
      expect(parseDosagePills()).toBe(1);
      expect(parseDosagePills('')).toBe(1);
    });

    it('extracts digits', () => {
      expect(parseDosagePills('2 tabletki')).toBe(2);
    });
  });
});
