import { enUS } from 'date-fns/locale';
import {
  buildGlucoseChartPoints,
  buildGlucoseDayGroups,
  formatGlucoseValue,
} from '../utils/vitalsInsights';

describe('vitalsInsights', () => {
  it('builds glucose chart with day labels on first reading of day', () => {
    const points = buildGlucoseChartPoints([
      { type: 'GLUCOSE', value: 100, measuredAt: '2026-06-13T08:00:00.000Z' },
      { type: 'GLUCOSE', value: 110, measuredAt: '2026-06-13T18:00:00.000Z' },
      { type: 'GLUCOSE', value: 95, measuredAt: '2026-06-14T08:00:00.000Z' },
    ]);
    expect(points).toHaveLength(3);
    expect(points[0].showLabel).toBe(true);
    expect(points[1].showLabel).toBe(false);
    expect(points[2].showLabel).toBe(true);
  });

  it('builds day groups only for days with readings', () => {
    const from = new Date(2026, 5, 12);
    const to = new Date(2026, 5, 14);
    const groups = buildGlucoseDayGroups(
      [{ type: 'GLUCOSE', value: 120, measuredAt: '2026-06-13T10:00:00.000Z' }],
      from,
      to,
      enUS,
      formatGlucoseValue,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].entries[0].text).toContain('120');
  });
});
