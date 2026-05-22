import { buildScheduleMarkedDates } from '../utils/buildScheduleMarkedDates';
import type { ScheduleItem } from '../context/MedsContext';

describe('buildScheduleMarkedDates', () => {
  it('marks days with ONCE schedule', () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const schedules: ScheduleItem[] = [
      {
        id: '1',
        type: 'ONCE',
        time: '10:00',
        startDate: dateStr,
        daysOfWeek: [],
      },
    ];
    const marks = buildScheduleMarkedDates(schedules, '#f00', 3);
    expect(marks[dateStr]).toEqual({ marked: true, dotColor: '#f00' });
  });
});
