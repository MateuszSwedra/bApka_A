import { buildMoodDistribution } from '../utils/moodDistribution';

describe('buildMoodDistribution', () => {
  it('returns null when no entries', () => {
    expect(buildMoodDistribution({})).toBeNull();
    expect(buildMoodDistribution({ happy: 0, neutral: 0, sad: 0 })).toBeNull();
  });

  it('computes percentages for moods', () => {
    const rows = buildMoodDistribution({ happy: 1, neutral: 1, sad: 2 });
    expect(rows).toEqual([
      { mood: 'sad', count: 2, percent: 50 },
      { mood: 'neutral', count: 1, percent: 25 },
      { mood: 'happy', count: 1, percent: 25 },
    ]);
  });
});
