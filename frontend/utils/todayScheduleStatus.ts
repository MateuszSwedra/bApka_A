/** Zgodne z oknem ±5 min w `schedules.service.ts` (TAKEN vs LATE). */
export const DOSE_ON_TIME_WINDOW_MINUTES = 5;

export type TodayScheduleUiKind =
  | 'taken'
  | 'late'
  | 'missed'
  | 'now'
  | 'next'
  | 'planned';

export type DoseLogLike = {
  scheduleId?: string;
  status?: string;
};

export function resolveTodayScheduleUiKind(
  log: DoseLogLike | undefined,
  scheduleMinutes: number,
  currentMinutes: number,
  isNext: boolean,
): TodayScheduleUiKind {
  if (log?.status === 'TAKEN') return 'taken';
  if (log?.status === 'LATE') return 'late';
  if (log?.status === 'MISSED') return 'missed';

  const diff = scheduleMinutes - currentMinutes;
  const w = DOSE_ON_TIME_WINDOW_MINUTES;

  if (log?.status === 'PENDING' || !log) {
    if (diff > w) return isNext ? 'next' : 'planned';
    if (diff >= -w) return 'now';
    return 'missed';
  }

  if (diff > w) return isNext ? 'next' : 'planned';
  if (diff >= -w) return 'now';
  return 'missed';
}

export function todayStatsBucketFromKind(kind: TodayScheduleUiKind): 'taken' | 'late' | 'missed' | 'pending' {
  if (kind === 'taken') return 'taken';
  if (kind === 'late') return 'late';
  if (kind === 'missed') return 'missed';
  return 'pending';
}
