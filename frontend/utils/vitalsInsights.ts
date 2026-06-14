import { format, startOfDay, type Locale } from 'date-fns';
import { formatLocalYmd } from './localCalendarDay';

export type VitalsLog = {
  type: string;
  value?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulse?: number | null;
  measuredAt: string;
};

export type VitalsDayEntry = {
  time: string;
  text: string;
};

export type VitalsDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: VitalsDayEntry[];
};

export type VitalsChartPoint = {
  label: string;
  value: number;
  showLabel?: boolean;
};

function dayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatLocalYmd(d);
}

function sortByMeasuredAt<T extends { measuredAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
  );
}

export function buildGlucoseChartPoints(logs: VitalsLog[]): VitalsChartPoint[] {
  const sorted = sortByMeasuredAt(
    logs.filter((l) => typeof l.value === 'number' && Number.isFinite(l.value)),
  );
  let lastDay = '';
  return sorted.map((l) => {
    const day = dayKeyFromIso(l.measuredAt);
    const showLabel = day !== lastDay;
    lastDay = day;
    const d = new Date(l.measuredAt);
    return {
      label: showLabel ? format(d, 'dd.MM') : '',
      value: l.value as number,
      showLabel,
    };
  });
}

export function buildBpChartSeries(logs: VitalsLog[]): {
  sys: VitalsChartPoint[];
  dia: VitalsChartPoint[];
} {
  const sorted = sortByMeasuredAt(
    logs.filter((l) => typeof l.systolic === 'number' && Number.isFinite(l.systolic)),
  );
  let lastDay = '';
  const sys: VitalsChartPoint[] = [];
  const dia: VitalsChartPoint[] = [];

  for (const l of sorted) {
    const day = dayKeyFromIso(l.measuredAt);
    const showLabel = day !== lastDay;
    lastDay = day;
    const d = new Date(l.measuredAt);
    const label = showLabel ? format(d, 'dd.MM') : '';
    sys.push({ label, value: l.systolic as number, showLabel });
    if (typeof l.diastolic === 'number' && Number.isFinite(l.diastolic)) {
      dia.push({ label, value: l.diastolic, showLabel });
    }
  }

  return { sys, dia };
}

function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayGroupsFromLogs(
  byDay: Map<string, VitalsLog[]>,
  from: Date,
  to: Date,
  locale: Locale,
  formatEntry: (log: VitalsLog) => string,
): VitalsDayGroup[] {
  const startKey = formatLocalYmd(startOfDay(from));
  const endKey = formatLocalYmd(startOfDay(to));
  if (endKey < startKey) return [];

  return Array.from(byDay.entries())
    .filter(([dayKey]) => dayKey >= startKey && dayKey <= endKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayLogs]) => {
      const sorted = sortByMeasuredAt(dayLogs);
      return {
        dayKey,
        dayLabel: format(ymdToLocalDate(dayKey), 'EEE, d MMM', { locale }),
        entries: sorted.map((log) => ({
          time: format(new Date(log.measuredAt), 'HH:mm'),
          text: formatEntry(log),
        })),
      };
    });
}

export function buildGlucoseDayGroups(
  logs: VitalsLog[],
  from: Date,
  to: Date,
  locale: Locale,
  formatEntry: (log: VitalsLog) => string,
): VitalsDayGroup[] {
  const byDay = new Map<string, VitalsLog[]>();
  for (const log of logs) {
    if (typeof log.value !== 'number') continue;
    const key = dayKeyFromIso(log.measuredAt);
    if (!key) continue;
    const bucket = byDay.get(key) ?? [];
    bucket.push(log);
    byDay.set(key, bucket);
  }

  return dayGroupsFromLogs(byDay, from, to, locale, formatEntry);
}

export function buildBpDayGroups(
  logs: VitalsLog[],
  from: Date,
  to: Date,
  locale: Locale,
  formatEntry: (log: VitalsLog) => string,
): VitalsDayGroup[] {
  const byDay = new Map<string, VitalsLog[]>();
  for (const log of logs) {
    if (typeof log.systolic !== 'number') continue;
    const key = dayKeyFromIso(log.measuredAt);
    if (!key) continue;
    const bucket = byDay.get(key) ?? [];
    bucket.push(log);
    byDay.set(key, bucket);
  }

  return dayGroupsFromLogs(byDay, from, to, locale, formatEntry);
}

export function formatGlucoseValue(log: VitalsLog): string {
  return `${Math.round(log.value as number)} mg/dL`;
}

export function formatBpValue(log: VitalsLog): string {
  const sys = Math.round(log.systolic as number);
  const dia =
    typeof log.diastolic === 'number' ? `/${Math.round(log.diastolic)}` : '';
  const pulse =
    typeof log.pulse === 'number' && log.pulse > 0 ? ` · ${Math.round(log.pulse)} bpm` : '';
  return `${sys}${dia} mmHg${pulse}`;
}
