import { buildDoseStatsPayload } from './dose-stats.build';
import { scheduleAppliesToDate } from './schedule-applies';

describe('scheduleAppliesToDate', () => {
  it('matches daily schedule on weekday', () => {
    expect(
      scheduleAppliesToDate(
        {
          id: 's1',
          type: 'DAILY',
          startDate: '2026-01-01',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        },
        '2026-06-13',
        'Europe/Warsaw',
      ),
    ).toBe(true);
  });
});

describe('buildDoseStatsPayload', () => {
  it('counts missing past slots as missed even without dose logs', () => {
    const from = new Date('2026-06-10T00:00:00.000Z');
    const to = new Date('2026-06-13T23:59:59.999Z');
    const now = new Date('2026-06-13T20:00:00.000Z');

    const result = buildDoseStatsPayload({
      schedules: [
        {
          id: 'sched-1',
          type: 'DAILY',
          startDate: '2026-01-01',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          time: '08:00',
          medication: 'Aspirin',
        },
      ],
      logs: [],
      from,
      to,
      now,
    });

    expect(result.counts.missed).toBeGreaterThan(0);
    expect(result.counts.totalPlanned).toBeGreaterThan(0);
    expect(result.daily.some((d) => d.status === 'missed')).toBe(true);
  });

  it('uses existing logs when present', () => {
    const day = '2026-06-13';
    const from = new Date('2026-06-13T00:00:00.000Z');
    const to = new Date('2026-06-13T23:59:59.999Z');
    const now = new Date('2026-06-13T20:00:00.000Z');

    const result = buildDoseStatsPayload({
      schedules: [
        {
          id: 'sched-1',
          type: 'DAILY',
          startDate: '2026-01-01',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          time: '08:00',
          medication: 'Aspirin',
        },
      ],
      logs: [
        {
          scheduleId: 'sched-1',
          status: 'TAKEN',
          scheduledAt: new Date(`${day}T06:00:00.000Z`),
        },
      ],
      from,
      to,
      now,
    });

    expect(result.onTime.takenOnTime).toBe(1);
    expect(result.counts.missed).toBe(0);
  });
});
