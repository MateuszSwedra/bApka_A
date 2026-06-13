export type DayStatus = 'perfect' | 'late' | 'missed' | 'pending' | 'empty';

export type DailyCounts = {
  taken: number;
  late: number;
  missed: number;
  pending: number;
};

export function computeAdherencePercent(taken: number, totalPlanned: number): number {
  if (totalPlanned <= 0) return 0;
  return Math.round((taken / totalPlanned) * 100);
}

export function classifyDayStatus(day: DailyCounts): DayStatus {
  const { taken, late, missed, pending } = day;
  const total = taken + missed + pending;
  if (total === 0 && late === 0) return 'empty';
  if (missed > 0) return 'missed';
  if (late > 0) return 'late';
  if (pending > 0) return 'pending';
  if (taken > 0) return 'perfect';
  return 'empty';
}

export type DailyEntryRaw = DailyCounts & {
  date: string;
  takenOnTime: number;
  takenTotal: number;
};

export type DailyEntryEnriched = DailyEntryRaw & {
  totalPlanned: number;
  adherencePercent: number;
  status: DayStatus;
};

export function enrichDailyEntry(entry: DailyEntryRaw): DailyEntryEnriched {
  const totalPlanned = entry.taken + entry.missed + entry.pending;
  return {
    ...entry,
    totalPlanned,
    adherencePercent: computeAdherencePercent(entry.taken, totalPlanned),
    status: classifyDayStatus(entry),
  };
}
