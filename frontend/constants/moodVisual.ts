import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type MoodValue = 'happy' | 'neutral' | 'sad';

export type MoodIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Wesoła / neutralna / smutna - osobne emotikony i kolory (zielony / szary / czerwony). */
export const MOOD_VISUAL: Record<
  MoodValue,
  { icon: MoodIconName; color: string; background: string; ring: string }
> = {
  happy: {
    icon: 'emoticon-happy-outline',
    color: '#1F7A4D',
    background: 'rgba(31, 122, 77, 0.14)',
    ring: 'rgba(31, 122, 77, 0.38)',
  },
  neutral: {
    icon: 'emoticon-neutral-outline',
    color: '#5C6B78',
    background: 'rgba(92, 107, 120, 0.14)',
    ring: 'rgba(92, 107, 120, 0.32)',
  },
  sad: {
    icon: 'emoticon-sad-outline',
    color: '#C23D3D',
    background: 'rgba(194, 61, 61, 0.12)',
    ring: 'rgba(194, 61, 61, 0.38)',
  },
};

export function parseMood(value: string | undefined | null): MoodValue | null {
  if (value === 'happy' || value === 'neutral' || value === 'sad') return value;
  return null;
}
