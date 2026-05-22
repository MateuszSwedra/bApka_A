jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => {
      const map: Record<string, string> = {
        'treatment.group.medication': 'Meds',
        'treatment.group.bloodSugar': 'Sugar',
        'treatment.group.bloodPressure': 'BP',
        'treatment.group.exercise': 'Exercise',
        'treatment.group.custom': 'Custom',
      };
      return map[key] ?? key;
    },
  },
}));

import { getTreatmentGroupLabel } from '../i18n/treatmentLabels';

describe('getTreatmentGroupLabel', () => {
  it('returns localized group labels', () => {
    expect(getTreatmentGroupLabel('MEDICATION')).toBe('Meds');
    expect(getTreatmentGroupLabel('CUSTOM')).toBe('Custom');
  });
});
