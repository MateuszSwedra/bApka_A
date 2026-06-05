import { formatLocalYmd } from './localCalendarDay';

export type DoseLogLike = {
  scheduleId?: string;
  status?: string;
  scheduledAt?: string | Date | null;
};

/** Lokalny dzień kalendarzowy wpisu dawki (yyyy-MM-dd). */
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
  return logs.find(
    l => String(l.scheduleId) === String(scheduleId) && doseLogMatchesLocalDate(l, dateStr),
  );
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
