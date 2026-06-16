import { formatLocalYmd } from './localCalendarDay';

export type DoseLogLike = {
  scheduleId?: string;
  status?: string;
  scheduledAt?: string | Date | null;
};

export function doseLogLocalYmd(log: { scheduledAt?: string | Date | null }): string | null {
  if (log.scheduledAt == null || log.scheduledAt === '') return null;
  const d =
    typeof log.scheduledAt === 'string' ? new Date(log.scheduledAt) : log.scheduledAt;
  if (Number.isNaN(d.getTime())) return null;
  return formatLocalYmd(d);
}

export function doseLogMatchesLocalDate(
  log: { scheduledAt?: string | Date | null },
  dateStr: string,
): boolean {
  const ymd = doseLogLocalYmd(log);
  return ymd !== null && ymd === dateStr;
}

export function findDoseLogForScheduleOnDate(
  logs: DoseLogLike[],
  scheduleId: string,
  dateStr: string,
): DoseLogLike | undefined {
  const forSchedule = logs.filter(l => String(l.scheduleId) === String(scheduleId));
  if (forSchedule.length === 0) return undefined;

  const completed = forSchedule.filter(
    l => l.status === 'TAKEN' || l.status === 'LATE' || l.status === 'MISSED',
  );
  if (completed.length > 0) {
    const takenLike = completed.find(l => l.status === 'TAKEN' || l.status === 'LATE');
    return takenLike ?? completed[0];
  }

  const dated = forSchedule.find(l => doseLogMatchesLocalDate(l, dateStr));
  if (dated) return dated;
  if (forSchedule.length === 1) return forSchedule[0];
  return forSchedule[0];
}

/** Scala logi z API tylko z podanego dnia kalendarzowego. */
export function mergeDoseLogsIntoCompletionSets(
  logs: DoseLogLike[],
  dateStr: string,
  completed: Set<string>,
  missed: Set<string>,
): void {
  for (const log of logs) {
    if (!log?.scheduleId || !doseLogMatchesLocalDate(log, dateStr)) continue;
    const sid = String(log.scheduleId);
    if (log.status === 'TAKEN' || log.status === 'LATE' || log.status === 'MISSED') {
      completed.add(sid);
    }
    if (log.status === 'MISSED') {
      missed.add(sid);
    }
  }
}
