import { enUS } from 'date-fns/locale';
import { buildMoodDayCells } from '../utils/moodWeekChart';

describe('buildMoodDayCells', () => {
  it('maps one mood per calendar day using latest log', () => {
    const from = new Date(2026, 5, 9);
    const to = new Date(2026, 5, 11);
    const cells = buildMoodDayCells(
      [
        { mood: 'happy', createdAt: new Date(2026, 5, 10, 8, 0).toISOString() },
        { mood: 'sad', createdAt: new Date(2026, 5, 10, 20, 0).toISOString() },
      ],
      from,
      to,
      enUS,
    );

    expect(cells).toHaveLength(3);
    expect(cells[0].mood).toBeNull();
    expect(cells[1].mood).toBe('sad');
    expect(cells[2].mood).toBeNull();
  });
});
