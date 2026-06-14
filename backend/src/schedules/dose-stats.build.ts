import {
  formatLocalYmd,
  getAppTimezone,
  scheduledAtOnLocalDay,
} from '../common/app-timezone';
import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';
import {
  computeAdherencePercent,
  enrichDailyEntry,
  type DailyEntryRaw,
} from './dose-stats.helpers';
import { scheduleAppliesToDate, type ScheduleForApply } from './schedule-applies';

type DoseLogRow = {
  scheduleId: string;
  status: string;
  scheduledAt: Date;
};

type ScheduleRow = ScheduleForApply & {
  id: string;
  medication?: string | null;
  time: string;
  inventoryId?: string | null;
  inventory?: { name?: string | null } | null;
};

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const utc = Date.UTC(y, m - 1, d + days, 12, 0, 0);
  return formatLocalYmd(new Date(utc));
}

function eachLocalYmd(from: Date, to: Date, timeZone: string): string[] {
  let ymd = formatLocalYmd(from, timeZone);
  const endYmd = formatLocalYmd(to, timeZone);
  const out: string[] = [];
  while (ymd <= endYmd) {
    out.push(ymd);
    ymd = addDaysToYmd(ymd, 1);
  }
  return out;
}

function emptyDaily(date: string): DailyEntryRaw {
  return {
    date,
    taken: 0,
    late: 0,
    missed: 0,
    pending: 0,
    takenOnTime: 0,
    takenTotal: 0,
  };
}

function applyLogStatus(entry: DailyEntryRaw, status: string): void {
  if (status === 'TAKEN') {
    entry.taken += 1;
    entry.takenTotal += 1;
    entry.takenOnTime += 1;
  } else if (status === 'LATE') {
    entry.taken += 1;
    entry.late += 1;
    entry.takenTotal += 1;
  } else if (status === 'MISSED') {
    entry.missed += 1;
  } else {
    entry.pending += 1;
  }
}

function applyMedStatus(
  row: { taken: number; late: number; missed: number; pending: number },
  status: string,
): void {
  if (status === 'TAKEN') {
    row.taken += 1;
  } else if (status === 'LATE') {
    row.taken += 1;
    row.late += 1;
  } else if (status === 'MISSED') {
    row.missed += 1;
  } else {
    row.pending += 1;
  }
}

function inferMissingSlotStatus(scheduledAt: Date, now: Date): 'MISSED' | 'PENDING' {
  const deadline =
    scheduledAt.getTime() + DOSE_CONFIRMATION_WINDOW_MINUTES * 60 * 1000;
  return now.getTime() > deadline ? 'MISSED' : 'PENDING';
}

export function buildDoseStatsPayload(params: {
  schedules: ScheduleRow[];
  logs: DoseLogRow[];
  from: Date;
  to: Date;
  now?: Date;
}) {
  const timeZone = getAppTimezone();
  const now = params.now ?? new Date();

  const logBySlot = new Map<string, DoseLogRow>();
  for (const log of params.logs) {
    const day = formatLocalYmd(log.scheduledAt, timeZone);
    logBySlot.set(`${log.scheduleId}:${day}`, log);
  }

  const dailyMap = new Map<string, DailyEntryRaw>();
  const medMap = new Map<
    string,
    { medKey: string; name: string; taken: number; late: number; missed: number; pending: number }
  >();

  for (const dayYmd of eachLocalYmd(params.from, params.to, timeZone)) {
    for (const schedule of params.schedules) {
      if (!scheduleAppliesToDate(schedule, dayYmd, timeZone)) continue;

      const slotKey = `${schedule.id}:${dayYmd}`;
      const daily = dailyMap.get(dayYmd) ?? emptyDaily(dayYmd);

      const medKey = schedule.inventoryId ?? schedule.medication ?? schedule.id;
      const name =
        schedule.inventory?.name?.trim() ||
        schedule.medication?.trim() ||
        schedule.time;
      const medRow =
        medMap.get(medKey) ?? { medKey, name, taken: 0, late: 0, missed: 0, pending: 0 };

      const existingLog = logBySlot.get(slotKey);
      let status: string;
      if (existingLog) {
        status = existingLog.status;
      } else {
        const scheduledAt = scheduledAtOnLocalDay(schedule.time, dayYmd, timeZone);
        status = inferMissingSlotStatus(scheduledAt, now);
      }

      applyLogStatus(daily, status);
      applyMedStatus(medRow, status);

      dailyMap.set(dayYmd, daily);
      medMap.set(medKey, medRow);
    }
  }

  let takenCount = 0;
  let lateCount = 0;
  let missedCount = 0;
  let pendingCount = 0;
  let onTimeTakenCount = 0;

  for (const entry of dailyMap.values()) {
    takenCount += entry.taken;
    lateCount += entry.late;
    missedCount += entry.missed;
    pendingCount += entry.pending;
    onTimeTakenCount += entry.takenOnTime;
  }

  const totalPlanned = takenCount + missedCount + pendingCount;
  const onTimePercent =
    takenCount > 0 ? Math.round((onTimeTakenCount / takenCount) * 100) : 0;

  const daily = Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => enrichDailyEntry(entry));

  const byMedication = Array.from(medMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    counts: {
      taken: takenCount,
      late: lateCount,
      missed: missedCount,
      pending: pendingCount,
      totalPlanned,
      adherencePercent: computeAdherencePercent(takenCount, totalPlanned),
    },
    daily,
    byMedication,
    onTime: {
      takenOnTime: onTimeTakenCount,
      percentOfTaken: onTimePercent,
      windowMinutes: DOSE_CONFIRMATION_WINDOW_MINUTES,
    },
  };
}
