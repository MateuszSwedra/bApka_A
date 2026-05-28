/** yyyy-MM-dd → data w lokalnej strefie (unika błędów parseISO / UTC). */
export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function compareYmd(a: string, b: string): number {
  return parseYmdLocal(a).getTime() - parseYmdLocal(b).getTime();
}

/** Z API (np. ISO datetime) → yyyy-MM-dd w lokalnej strefie. */
export function normalizeYmd(raw?: string | null): string | undefined {
  if (raw == null || raw === '') return undefined;
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}
