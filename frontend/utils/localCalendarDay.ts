/** Bieżący dzień kalendarzowy w lokalnej strefie (yyyy-MM-dd). */
export function formatLocalYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Milisekundy do najbliższej lokalnej północy (następnego dnia kalendarzowego). */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return Math.max(50, next.getTime() - from.getTime());
}
