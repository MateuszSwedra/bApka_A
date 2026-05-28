import {
  doseLogMatchesLocalDate,
  mergeDoseLogsIntoCompletionSets,
} from '../utils/doseLogDay';

describe('doseLogDay', () => {
  it('matches log scheduledAt to local calendar day', () => {
    const log = { scheduleId: 's1', status: 'MISSED', scheduledAt: new Date(2026, 4, 28, 15, 0, 0) };
    expect(doseLogMatchesLocalDate(log, '2026-05-28')).toBe(true);
    expect(doseLogMatchesLocalDate(log, '2026-05-29')).toBe(false);
  });

  it('does not merge yesterday logs into today completion sets', () => {
    const completed = new Set<string>();
    const missed = new Set<string>();
    mergeDoseLogsIntoCompletionSets(
      [{ scheduleId: 'sol', status: 'MISSED', scheduledAt: new Date(2026, 4, 28, 8, 0, 0) }],
      '2026-05-29',
      completed,
      missed,
    );
    expect(completed.has('sol')).toBe(false);
    expect(missed.has('sol')).toBe(false);
  });

  it('merges only logs from requested day', () => {
    const completed = new Set<string>();
    const missed = new Set<string>();
    mergeDoseLogsIntoCompletionSets(
      [{ scheduleId: 'a', status: 'TAKEN', scheduledAt: new Date(2026, 4, 29, 8, 0, 0) }],
      '2026-05-29',
      completed,
      missed,
    );
    expect(completed.has('a')).toBe(true);
    expect(missed.has('a')).toBe(false);
  });
});
