import type { MoodValue } from '../constants/moodVisual';

export type MoodDistributionRow = {
  mood: MoodValue;
  count: number;
  percent: number;
};

const MOOD_ORDER: MoodValue[] = ['sad', 'neutral', 'happy'];

/** Procentowy rozkład nastrojów w okresie (z histogramu API). */
export function buildMoodDistribution(
  histogram: Record<string, number> | undefined | null,
): MoodDistributionRow[] | null {
  if (!histogram) return null;

  const counts: Record<MoodValue, number> = {
    happy: histogram.happy ?? 0,
    neutral: histogram.neutral ?? 0,
    sad: histogram.sad ?? 0,
  };

  const total = counts.happy + counts.neutral + counts.sad;
  if (total <= 0) return null;

  return MOOD_ORDER.map((mood) => ({
    mood,
    count: counts[mood],
    percent: Math.round((counts[mood] / total) * 100),
  })).filter((row) => row.count > 0);
}
