/** Strefa biznesowa aplikacji — godziny harmonogramów (HH:mm) są w tej strefie. */
export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE?.trim() || 'Europe/Warsaw';
}

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getLocalDateParts(
  date: Date = new Date(),
  timeZone: string = getAppTimezone(),
): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}

export function formatLocalHm(date: Date = new Date(), timeZone?: string): string {
  const p = getLocalDateParts(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function formatLocalYmd(date: Date = new Date(), timeZone?: string): string {
  const p = getLocalDateParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const utc = Date.UTC(y, m - 1, d + days, 12, 0, 0);
  return formatLocalYmd(new Date(utc));
}

/** Offset ms: instant w UTC vs ten sam moment wyświetlony w `timeZone`. */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const p = getLocalDateParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
  return asUtc - date.getTime();
}

/** Lokalna data+czas w `timeZone` → instant UTC (Date). */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = getAppTimezone(),
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 3; i++) {
    const offset = getTimezoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offset;
  }
  return new Date(utcMs);
}

/** yyyy-MM-dd w strefie aplikacji → [start, end) do zapytań Prisma. */
export function getLocalDayRange(
  dateYmd?: string,
  timeZone: string = getAppTimezone(),
): { start: Date; end: Date } {
  const ymd = dateYmd && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd) ? dateYmd : formatLocalYmd(undefined, timeZone);
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const start = zonedLocalToUtc(y, m, d, 0, 0, timeZone);
  const nextYmd = addDaysToYmd(ymd, 1);
  const [ny, nm, nd] = nextYmd.split('-').map((x) => Number(x));
  const end = zonedLocalToUtc(ny, nm, nd, 0, 0, timeZone);
  return { start, end };
}

/** Dzisiaj w strefie aplikacji + HH:mm → scheduledAt w UTC. */
export function scheduledAtOnLocalDay(
  timeHm: string,
  dateYmd?: string,
  timeZone: string = getAppTimezone(),
): Date {
  const ymd = dateYmd && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd) ? dateYmd : formatLocalYmd(undefined, timeZone);
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  const [hh, mm] = timeHm.split(':').map((x) => Number(x));
  return zonedLocalToUtc(y, m, d, hh, mm, timeZone);
}
