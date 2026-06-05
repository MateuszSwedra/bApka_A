import type { TFunction } from 'i18next';
import { TREATMENT_VISUAL, type TreatmentIconName, type TreatmentType } from '../constants/treatmentVisuals';
import type { DependentMainScheduleState } from './dependentScheduleUi';
import { treatmentTypeForSchedule } from './scheduleTreatmentType';
import type { ScheduleItem, Treatment } from '../context/MedsContext';

const TYPE_KEY: Record<TreatmentType, string> = {
  MEDICATION: 'medication',
  BLOOD_SUGAR: 'bloodSugar',
  BLOOD_PRESSURE: 'bloodPressure',
  EXERCISE: 'exercise',
  CUSTOM: 'custom',
};

export type SeniorActionTileContent = {
  icon: TreatmentIconName;
  title: string;
  idleTitle: string;
  accent: string;
};

export function seniorActionTileContent(
  mainState: DependentMainScheduleState,
  schedules: ScheduleItem[],
  treatments: Treatment[],
  t: TFunction,
): SeniorActionTileContent {
  const scheduleId =
    mainState.kind === 'due' || mainState.kind === 'missed' ? mainState.scheduleId : undefined;
  const activityType: TreatmentType =
    (scheduleId ? treatmentTypeForSchedule(scheduleId, schedules, treatments) : null) ??
    'MEDICATION';
  const visual = TREATMENT_VISUAL[activityType];
  const typeKey = TYPE_KEY[activityType];
  const isLate = mainState.kind === 'missed';

  const title = isLate
    ? t(`dependent.home.action.${typeKey}.titleLate`)
    : t(`dependent.home.action.${typeKey}.title`);
  const idleTitle = t(`dependent.home.action.${typeKey}.idle`);

  return {
    icon: visual.icon,
    title,
    idleTitle,
    accent: visual.accent,
  };
}
