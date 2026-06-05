import type { ScheduleItem, Treatment } from '../context/MedsContext';
import { resolveSeniorActivityName } from '../utils/seniorActivityLabel';

describe('seniorActivityLabel', () => {
  const medicationPl: Treatment = {
    id: 't1',
    type: 'MEDICATION',
    name: 'Lek',
  };

  it('keeps custom names that are not defaults', () => {
    const sch: ScheduleItem = {
      id: 's1',
      treatmentId: 't1',
      customName: 'Aspiryna',
      type: 'ONCE',
      time: '08:00',
      startDate: '2026-05-22',
      daysOfWeek: [],
    };
    expect(resolveSeniorActivityName(sch, { ...medicationPl, name: 'Aspiryna' })).toBe('Aspiryna');
  });

  it('maps English default treatment name to Polish', () => {
    const sch: ScheduleItem = {
      id: 's1',
      treatmentId: 't1',
      type: 'ONCE',
      time: '08:00',
      startDate: '2026-05-22',
      daysOfWeek: [],
    };
    const enTreatment: Treatment = {
      id: 't1',
      type: 'MEDICATION',
      name: 'Medication',
    };
    expect(resolveSeniorActivityName(sch, enTreatment)).toBe('Lek');
  });

  it('maps English blood sugar default to Polish', () => {
    const sch: ScheduleItem = {
      id: 's1',
      treatmentId: 't2',
      type: 'ONCE',
      time: '09:00',
      startDate: '2026-05-22',
      daysOfWeek: [],
    };
    const enTreatment: Treatment = {
      id: 't2',
      type: 'BLOOD_SUGAR',
      name: 'Blood sugar',
    };
    expect(resolveSeniorActivityName(sch, enTreatment)).toBe('Badanie cukru');
  });
});
