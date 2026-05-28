import { format } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';
import { getScheduleTreatmentId } from '../context/MedsContext';
import type { Treatment } from '../context/MedsContext';
import { scheduleAppliesToDate } from './scheduleHelpers';
import { timeToMinutes } from './scheduleHelpers';
import { DOSE_ON_TIME_WINDOW_MINUTES } from './todayScheduleStatus';
import i18n from '../i18n';

export type DependentMainScheduleState =
  | { kind: 'empty' }
  | { kind: 'all_done' }
  | { kind: 'upcoming'; nextTime: string; nextName: string }
  | { kind: 'due'; scheduleId: string; name: string }
  | { kind: 'missed'; scheduleId: string; name: string };

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

/** Senior może potwierdzić dawkę w oknie ±15 min od planowanej godziny. */
export function canConfirmDoseAtTime(scheduleMinutes: number, nowMinutes: number): boolean {
  const w = DOSE_ON_TIME_WINDOW_MINUTES;
  return scheduleMinutes - w <= nowMinutes && nowMinutes <= scheduleMinutes + w;
}

/** Po upływie okna dawka jest traktowana jako pominięta. */
export function isPastDoseConfirmationWindow(scheduleMinutes: number, nowMinutes: number): boolean {
  return nowMinutes > scheduleMinutes + DOSE_ON_TIME_WINDOW_MINUTES;
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
  const w = DOSE_ON_TIME_WINDOW_MINUTES;

  const allDone = rows.every(r => completedIds.has(r.sch.id));
  if (allDone) return { kind: 'all_done' };

  const incomplete = rows.filter(r => !completedIds.has(r.sch.id));

  const dueRow = incomplete.find(r => canConfirmDoseAtTime(r.minutes, nowM));
  if (dueRow) {
    return { kind: 'due', scheduleId: dueRow.sch.id, name: dueRow.name };
  }

  const missedRow = incomplete.find(r => isPastDoseConfirmationWindow(r.minutes, nowM));
  if (missedRow) {
    return { kind: 'missed', scheduleId: missedRow.sch.id, name: missedRow.name };
  }

  const upcomingRow = incomplete.find(r => nowM < r.minutes - w);
  if (upcomingRow) {
    return { kind: 'upcoming', nextTime: upcomingRow.sch.time, nextName: upcomingRow.name };
  }

  return { kind: 'all_done' };
}

/** Wszystkie dawki po terminie potwierdzenia (do auto-oznaczenia MISSED). */
export function schedulesPastConfirmationWindow(
  schedules: ScheduleItem[],
  treatments: Treatment[],
  completedIds: Set<string>,
  now: Date,
): { sch: ScheduleItem; name: string }[] {
  const dateStr = format(now, 'yyyy-MM-dd');
  const nowM = now.getHours() * 60 + now.getMinutes();
  return schedulesForDateSorted(schedules, treatments, dateStr)
    .filter(r => !completedIds.has(r.sch.id) && isPastDoseConfirmationWindow(r.minutes, nowM))
    .map(({ sch, name }) => ({ sch, name }));
}
