import i18n from './index';
import type { TreatmentType } from '../constants/treatmentVisuals';

const GROUP_KEYS: Record<TreatmentType, string> = {
  MEDICATION: 'treatment.group.medication',
  BLOOD_SUGAR: 'treatment.group.bloodSugar',
  BLOOD_PRESSURE: 'treatment.group.bloodPressure',
  EXERCISE: 'treatment.group.exercise',
  CUSTOM: 'treatment.group.custom',
};

export function getTreatmentGroupLabel(type: TreatmentType): string {
  return i18n.t(GROUP_KEYS[type]);
}
