function paramString(v?: string | string[]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export type AddMedPrefill = {
  prefillDate?: string;
  prefillTime?: string;
};

/** 1 = poniedziałek … 7 = niedziela (zgodnie z WEEKDAY_IDS). */
export function weekdayIdFromYmd(ymd: string): number {
  const day = new Date(`${ymd}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

export function initialRegularWeekdays(prefillDate?: string): number[] {
  if (!prefillDate) return [];
  return [weekdayIdFromYmd(prefillDate)];
}

export function readAddMedPrefill(
  params: Record<string, string | string[] | undefined>,
): AddMedPrefill {
  const prefillDate = paramString(params.prefillDate);
  const prefillTime = paramString(params.prefillTime);
  return {
    ...(prefillDate ? { prefillDate } : {}),
    ...(prefillTime ? { prefillTime } : {}),
  };
}

export function addMedPrefillParams(prefill: AddMedPrefill): Record<string, string> {
  const out: Record<string, string> = {};
  if (prefill.prefillDate) out.prefillDate = prefill.prefillDate;
  if (prefill.prefillTime) out.prefillTime = prefill.prefillTime;
  return out;
}

export function mergeAddMedPrefill(
  params: Record<string, string | undefined>,
  prefill: AddMedPrefill,
): Record<string, string | undefined> {
  return { ...params, ...addMedPrefillParams(prefill) };
}

export function parsePrefillTime(time?: string): { hour: number; minute: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatSlotTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}
