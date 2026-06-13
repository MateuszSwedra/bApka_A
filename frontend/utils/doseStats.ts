import { eachDayOfInterval, format, parseISO } from 'date-fns';

export type RangeKey = 'today' | 'week' | 'month';

export type DayStatus = 'perfect' | 'late' | 'missed' | 'pending' | 'empty';

export type DailyEntry = {
  date: string;
  taken: number;
  late?: number;
  missed: number;
  pending: number;
  takenOnTime?: number;
  takenTotal?: number;
  totalPlanned?: number;
  adherencePercent?: number;
  status?: DayStatus;
};

export type DoseCounts = {
  taken: number;
  late?: number;
  missed: number;
  pending: number;
  totalPlanned?: number;
  adherencePercent?: number;
};

export type MedicationDoseStats = {
  medKey: string;
  name: string;
  taken: number;
  late: number;
  missed: number;
  pending: number;
};

export type DoseStatsPayload = {
  range: { from: string; to: string };
  counts: DoseCounts;
  daily?: DailyEntry[];
  byMedication?: MedicationDoseStats[];
  onTime?: { takenOnTime: number; percentOfTaken: number; windowMinutes: number };
};

export const ADHERENCE_THRESHOLDS = { good: 90, ok: 70 } as const;

export const DAY_STATUS_COLORS: Record<DayStatus, string> = {
  perfect: '#1F7A4D',
  late: '#E9A43D',
  missed: '#C23D3D',
  pending: '#D1D5DB',
  empty: '#F9F3EF',
};

export function computeAdherencePercent(taken: number, totalPlanned: number): number {
  if (totalPlanned <= 0) return 0;
  return Math.round((taken / totalPlanned) * 100);
}

export function classifyDayStatus(day: Pick<DailyEntry, 'taken' | 'late' | 'missed' | 'pending'>): DayStatus {
  const taken = day.taken ?? 0;
  const late = day.late ?? 0;
  const missed = day.missed ?? 0;
  const pending = day.pending ?? 0;
  const total = taken + missed + pending;
  if (total === 0 && late === 0) return 'empty';
  if (missed > 0) return 'missed';
  if (late > 0) return 'late';
  if (pending > 0) return 'pending';
  if (taken > 0) return 'perfect';
  return 'empty';
}

export function enrichDailyEntry(entry: DailyEntry): DailyEntry {
  const totalPlanned = entry.taken + entry.missed + entry.pending;
  const status = entry.status ?? classifyDayStatus(entry);
  return {
    ...entry,
    totalPlanned,
    adherencePercent: entry.adherencePercent ?? computeAdherencePercent(entry.taken, totalPlanned),
    status,
  };
}

export function getCountsAdherence(counts: DoseCounts): number {
  if (counts.adherencePercent != null) return counts.adherencePercent;
  const totalPlanned =
    counts.totalPlanned ?? counts.taken + counts.missed + counts.pending;
  return computeAdherencePercent(counts.taken, totalPlanned);
}

export function getAdherenceColor(percent: number): string {
  if (percent >= ADHERENCE_THRESHOLDS.good) return DAY_STATUS_COLORS.perfect;
  if (percent >= ADHERENCE_THRESHOLDS.ok) return DAY_STATUS_COLORS.late;
  return DAY_STATUS_COLORS.missed;
}

function emptyDay(date: string): DailyEntry {
  return {
    date,
    taken: 0,
    late: 0,
    missed: 0,
    pending: 0,
    totalPlanned: 0,
    adherencePercent: 0,
    status: 'empty',
  };
}

/** Uzupełnia brakujące dni w zakresie API wartościami empty. */
export function fillDailyGaps(daily: DailyEntry[] | undefined, fromIso: string, toIso: string): DailyEntry[] {
  const from = parseISO(fromIso);
  const to = parseISO(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return (daily ?? []).map(enrichDailyEntry);
  }

  const byDate = new Map<string, DailyEntry>();
  for (const entry of daily ?? []) {
    byDate.set(entry.date, enrichDailyEntry(entry));
  }

  const days = eachDayOfInterval({ start: from, end: to });
  return days.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    return byDate.get(key) ?? emptyDay(key);
  });
}

export type MedicationWithAdherence = MedicationDoseStats & {
  planned: number;
  percent: number | null;
};

export function sortMedicationsByAdherence(meds: MedicationDoseStats[]): MedicationWithAdherence[] {
  return meds
    .map((med) => {
      const planned = med.taken + med.missed + med.pending;
      const percent = planned > 0 ? computeAdherencePercent(med.taken, planned) : null;
      return { ...med, planned, percent };
    })
    .sort((a, b) => {
      const pa = a.percent ?? -1;
      const pb = b.percent ?? -1;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
}

export function getDayStatusColor(status: DayStatus): string {
  return DAY_STATUS_COLORS[status];
}
