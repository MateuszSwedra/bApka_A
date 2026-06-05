import type { ScheduleItem, Treatment } from '../context/MedsContext';
import { getScheduleTreatmentId } from '../context/MedsContext';
import type { TreatmentType } from '../constants/treatmentVisuals';

export function treatmentTypeForSchedule(
  scheduleId: string,
  schedules: ScheduleItem[],
  treatments: Treatment[],
): TreatmentType | null {
  const sch = schedules.find(s => s.id === scheduleId);
  if (!sch) return null;
  const tid = getScheduleTreatmentId(sch);
  const treatment = tid ? treatments.find(tr => tr.id === tid) : undefined;
  return treatment?.type ?? null;
}
