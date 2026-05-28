jest.mock('../context/MedsContext', () => ({
  getScheduleTreatmentId: (s: { treatmentId?: string; inventoryId?: string }) =>
    s.treatmentId ?? s.inventoryId,
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string, opts?: { count?: string }) => {
      if (key === 'schedule.activityFallback') return 'Activity';
      if (key === 'schedule.dosagePieces') return ` (${opts?.count} pcs.)`;
      return key;
    },
  },
}));

import type { ScheduleItem, Treatment } from '../context/MedsContext';
import {
  schedulesForDateSorted,
  computeDependentMainScheduleState,
  canConfirmDoseAtTime,
  isPastDoseConfirmationWindow,
  schedulesPastConfirmationWindow,
} from '../utils/dependentScheduleUi';

const treatments: Treatment[] = [
  { id: 't1', type: 'MEDICATION', name: 'Aspirin' },
];

describe('dependentScheduleUi', () => {
  const baseSchedule: ScheduleItem = {
    id: 's1',
    treatmentId: 't1',
    type: 'ONCE',
    time: '08:00',
    startDate: '2026-05-22',
    daysOfWeek: [],
    dosage: '2',
  };

  it('schedulesForDateSorted includes dosage suffix', () => {
    const rows = schedulesForDateSorted([baseSchedule], treatments, '2026-05-22');
    expect(rows[0].name).toBe('Aspirin (2 pcs.)');
  });

  it('computeDependentMainScheduleState returns empty when no schedules', () => {
    const state = computeDependentMainScheduleState([], [], new Set(), new Date());
    expect(state).toEqual({ kind: 'empty' });
  });

  it('returns due within ±15 min window', () => {
    const now = new Date('2026-05-22T08:10:00');
    const state = computeDependentMainScheduleState(
      [baseSchedule],
      treatments,
      new Set(),
      now,
    );
    expect(state.kind).toBe('due');
    if (state.kind === 'due') {
      expect(state.name).toContain('Aspirin');
    }
  });

  it('returns missed after 15 min past scheduled time', () => {
    const now = new Date('2026-05-22T08:16:00');
    const state = computeDependentMainScheduleState(
      [baseSchedule],
      treatments,
      new Set(),
      now,
    );
    expect(state).toEqual({ kind: 'missed', scheduleId: 's1', name: expect.stringContaining('Aspirin') });
  });

  it('returns upcoming before confirmation window opens', () => {
    const now = new Date('2026-05-22T07:40:00');
    const state = computeDependentMainScheduleState(
      [baseSchedule],
      treatments,
      new Set(),
      now,
    );
    expect(state.kind).toBe('upcoming');
  });

  it('returns all_done when every item completed', () => {
    const now = new Date('2026-05-22T10:00:00');
    const state = computeDependentMainScheduleState(
      [baseSchedule],
      treatments,
      new Set(['s1']),
      now,
    );
    expect(state).toEqual({ kind: 'all_done' });
  });

  it('canConfirmDoseAtTime and isPastDoseConfirmationWindow', () => {
    const scheduleM = 8 * 60;
    expect(canConfirmDoseAtTime(scheduleM, scheduleM)).toBe(true);
    expect(canConfirmDoseAtTime(scheduleM, scheduleM + 15)).toBe(true);
    expect(canConfirmDoseAtTime(scheduleM, scheduleM + 16)).toBe(false);
    expect(isPastDoseConfirmationWindow(scheduleM, scheduleM + 16)).toBe(true);
  });

  it('schedulesPastConfirmationWindow lists overdue doses', () => {
    const now = new Date('2026-05-22T09:00:00');
    const past = schedulesPastConfirmationWindow([baseSchedule], treatments, new Set(), now);
    expect(past).toHaveLength(1);
    expect(past[0].sch.id).toBe('s1');
  });
});
