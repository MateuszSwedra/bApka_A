import { format } from 'date-fns';
import type { ScheduleItem } from '../context/MedsContext';
import { getScheduleTreatmentId } from '../context/MedsContext';
import type { Treatment } from '../context/MedsContext';
import { scheduleAppliesToDate } from './scheduleHelpers';
import { timeToMinutes } from './scheduleHelpers';

export type DependentMainScheduleState =
  | { kind: 'empty' }
  | { kind: 'all_done' }
  | { kind: 'upcoming'; nextTime: string; nextName: string; dose: string }
  | { kind: 'due'; scheduleId: string; name: string; dose: string; time: string };

export type MoodScheduleState =
  | { kind: 'disabled' }
  | { kind: 'inactive'; nextTime: string }
  | { kind: 'active'; slotTime: string };

/** Domyślne godziny sprawdzania nastroju — do czasu konfiguracji przez opiekuna w API. */
export const DEFAULT_MOOD_CHECK_TIMES = ['08:00', '14:00', '20:00'];

const MOOD_ACTIVE_WINDOW_MINUTES = 60;

function scheduleName(sch: ScheduleItem, treatments: Treatment[]): string {
  if (sch.customName) return sch.customName;
  const tid = getScheduleTreatmentId(sch);
  if (tid) return treatments.find(t => t.id === tid)?.name ?? 'Aktywność';
  return 'Aktywność';
}

function scheduleDose(sch: ScheduleItem): string {
  if (!sch.dosage || sch.dosage === '1') return '1 dawka';
  return `${sch.dosage} szt.`;
}

function labelForSchedule(sch: ScheduleItem, treatments: Treatment[]): string {
  const name = scheduleName(sch, treatments);
  const dose = scheduleDose(sch);
  if (dose === '1 dawka') return name;
  return `${name} (${dose})`;
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
    return {
      kind: 'due',
      scheduleId: first.sch.id,
      name: scheduleName(first.sch, treatments),
      dose: scheduleDose(first.sch),
      time: first.sch.time,
    };
  }

  const upcoming = rows.filter(r => r.minutes > nowM && !completedIds.has(r.sch.id));
  if (upcoming.length > 0) {
    const u = upcoming[0];
    return {
      kind: 'upcoming',
      nextTime: u.sch.time,
      nextName: scheduleName(u.sch, treatments),
      dose: scheduleDose(u.sch),
    };
  }

  return { kind: 'all_done' };
}

export function computeMoodScheduleState(
  moodTimes: string[],
  completedSlots: Set<string>,
  now: Date,
): MoodScheduleState {
  if (moodTimes.length === 0) return { kind: 'disabled' };

  const nowM = now.getHours() * 60 + now.getMinutes();
  const sorted = [...moodTimes].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

  for (const slot of sorted) {
    const slotM = timeToMinutes(slot);
    const diff = nowM - slotM;
    if (diff >= 0 && diff <= MOOD_ACTIVE_WINDOW_MINUTES && !completedSlots.has(slot)) {
      return { kind: 'active', slotTime: slot };
    }
  }

  const next = sorted.find(slot => {
    const slotM = timeToMinutes(slot);
    return slotM > nowM && !completedSlots.has(slot);
  });
  if (next) return { kind: 'inactive', nextTime: next };

  const firstTomorrow = sorted.find(slot => !completedSlots.has(slot));
  if (firstTomorrow) return { kind: 'inactive', nextTime: firstTomorrow };

  return { kind: 'disabled' };
}
