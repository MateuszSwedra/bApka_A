import {
  classifyDayStatus,
  computeAdherencePercent,
  enrichDailyEntry,
} from './dose-stats.helpers';

describe('dose-stats.helpers', () => {
  describe('computeAdherencePercent', () => {
    it('returns 0 when nothing planned', () => {
      expect(computeAdherencePercent(0, 0)).toBe(0);
    });

    it('rounds taken / planned ratio', () => {
      expect(computeAdherencePercent(9, 10)).toBe(90);
      expect(computeAdherencePercent(2, 3)).toBe(67);
    });
  });

  describe('classifyDayStatus', () => {
    it('classifies perfect day', () => {
      expect(classifyDayStatus({ taken: 3, late: 0, missed: 0, pending: 0 })).toBe('perfect');
    });

    it('classifies late day without misses', () => {
      expect(classifyDayStatus({ taken: 2, late: 1, missed: 0, pending: 0 })).toBe('late');
    });

    it('classifies missed day as worst status', () => {
      expect(classifyDayStatus({ taken: 1, late: 1, missed: 1, pending: 0 })).toBe('missed');
    });

    it('classifies pending-only day', () => {
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 2 })).toBe('pending');
    });

    it('classifies empty day', () => {
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 0 })).toBe('empty');
    });
  });

  describe('enrichDailyEntry', () => {
    it('adds totals and status', () => {
      const result = enrichDailyEntry({
        date: '2026-06-13',
        taken: 2,
        late: 0,
        missed: 1,
        pending: 0,
        takenOnTime: 2,
        takenTotal: 2,
      });
      expect(result.totalPlanned).toBe(3);
      expect(result.adherencePercent).toBe(67);
      expect(result.status).toBe('missed');
    });
  });
});
