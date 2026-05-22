import { format } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';
import { getScheduleTreatmentId } from '../context/MedsContext';
import type { Treatment } from '../context/MedsContext';
import { scheduleAppliesToDate } from './scheduleHelpers';
import { timeToMinutes } from './scheduleHelpers';
import i18n from '../i18n';

export type DependentMainScheduleState =
  | { kind: 'empty' }
  | { kind: 'all_done' }
  | { kind: 'upcoming'; nextTime: string; nextName: string }
  | { kind: 'due'; scheduleId: string; name: string };

function labelForSchedule(sch: ScheduleItem, treatments: Treatment[]): string {
  let name = i18n.t('schedule.activityFallback');
  if (sch.customName) {
    name = sch.customName;
  } else {
    const tid = getScheduleTreatmentId(sch);
    if (tid) name = treatments.find(t => t.id === tid)?.name ?? i18n.t('schedule.activityFallback');
  }
  if (sch.dosage && sch.dosage !== '1') {
    name += i18n.t('schedule.dosagePieces', { count: sch.dosage });
  }
  return name;
}

/** Today’s calendar entries sorted by time. */
export function schedulesForDateSorted(
  schedules: ScheduleItem[],
  treatments: Treatment[],
  dateStr: string,
): { sch: ScheduleItem; name: string; minutes: number }[] {
  return schedules
    .filter(s => scheduleAppliesToDate(s, dateStr))
    .map(sch => ({
      sch,
      name: labelForSchedule(sch, treatments),
      minutes: timeToMinutes(sch.time),
    }))
    .sort((a, b) => a.minutes - b.minutes);
}

export function computeDependentMainScheduleState(
  schedules: ScheduleItem[],
  treatments: Treatment[],
  completedIds: Set<string>,
  now: Date,
): DependentMainScheduleState {
  const dateStr = format(now, 'yyyy-MM-dd');
  const rows = schedulesForDateSorted(schedules, treatments, dateStr);
  if (rows.length === 0) return { kind: 'empty' };

  const nowM = now.getHours() * 60 + now.getMinutes();

  const allDone = rows.every(r => completedIds.has(r.sch.id));
  if (allDone) return { kind: 'all_done' };

  const due = rows.filter(r => r.minutes <= nowM && !completedIds.has(r.sch.id));
  if (due.length > 0) {
    const first = due[0];
    return { kind: 'due', scheduleId: first.sch.id, name: first.name };
  }

  const upcoming = rows.filter(r => r.minutes > nowM && !completedIds.has(r.sch.id));
  if (upcoming.length > 0) {
    const u = upcoming[0];
    return { kind: 'upcoming', nextTime: u.sch.time, nextName: u.name };
  }

  return { kind: 'all_done' };
}
