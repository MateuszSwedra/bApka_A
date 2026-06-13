import {
  formatLocalHm,
  formatLocalYmd,
  getLocalDayRange,
  scheduledAtOnLocalDay,
  zonedLocalToUtc,
} from './app-timezone';

describe('app-timezone', () => {
  const tz = 'Europe/Warsaw';

  beforeEach(() => {
    process.env.APP_TIMEZONE = tz;
  });

  it('formatLocalHm uses APP_TIMEZONE not UTC', () => {
    // 2026-06-13 20:30 UTC = 22:30 CEST
    const instant = new Date('2026-06-13T20:30:00.000Z');
    expect(formatLocalHm(instant, tz)).toBe('22:30');
  });

  it('scheduledAtOnLocalDay maps local wall time to UTC instant', () => {
    const at = scheduledAtOnLocalDay('22:03', '2026-06-13', tz);
    expect(at.toISOString()).toBe('2026-06-13T20:03:00.000Z');
  });

  it('getLocalDayRange covers full Warsaw calendar day in UTC', () => {
    const { start, end } = getLocalDayRange('2026-06-13', tz);
    expect(start.toISOString()).toBe('2026-06-12T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-13T22:00:00.000Z');
  });

  it('formatLocalYmd returns calendar date in Warsaw', () => {
    const instant = new Date('2026-06-13T22:30:00.000Z');
    expect(formatLocalYmd(instant, tz)).toBe('2026-06-14');
  });

  it('zonedLocalToUtc midnight Warsaw', () => {
    const midnight = zonedLocalToUtc(2026, 6, 13, 0, 0, tz);
    expect(midnight.toISOString()).toBe('2026-06-12T22:00:00.000Z');
  });
});
