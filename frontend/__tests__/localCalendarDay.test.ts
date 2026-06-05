import { msUntilNextLocalMidnight } from '../utils/localCalendarDay';

describe('msUntilNextLocalMidnight', () => {
  it('returns positive ms until next local midnight', () => {
    const at = new Date(2026, 4, 28, 23, 30, 0);
    const ms = msUntilNextLocalMidnight(at);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(31 * 60 * 1000);
  });

  it('is about 24h just after midnight', () => {
    const at = new Date(2026, 4, 28, 0, 5, 0);
    const ms = msUntilNextLocalMidnight(at);
    expect(ms).toBeGreaterThan(23 * 60 * 60 * 1000);
  });
});
