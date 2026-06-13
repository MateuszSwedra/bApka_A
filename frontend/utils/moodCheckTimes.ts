export const DEFAULT_MOOD_CHECK_TIMES = ['08:00'];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeMoodCheckTimes(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_MOOD_CHECK_TIMES];
  const valid = raw
    .map(v => String(v).trim())
    .filter(v => TIME_PATTERN.test(v));
  const unique = [...new Set(valid)].sort();
  const time = unique[0] ?? DEFAULT_MOOD_CHECK_TIMES[0];
  return [time];
}
