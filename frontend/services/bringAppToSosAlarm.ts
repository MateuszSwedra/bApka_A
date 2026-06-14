import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { SosDisplayParams } from './sosNotifeeDisplay';

const DEDUPE_MS = 3000;
let lastKey = '';
let lastAt = 0;

/** Otwiera /sos-alarm przez deep link — działa z headless JS (FCM w tle). */
export async function bringAppToSosAlarm(params: SosDisplayParams): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const key = `${params.dependentId ?? ''}:${params.body}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUPE_MS) return false;
  lastKey = key;
  lastAt = now;

  try {
    const url = Linking.createURL('/sos-alarm', {
      queryParams: {
        dependentId: params.dependentId ?? '',
        dependentName: params.dependentName ?? '',
        body: params.body ?? '',
      },
    });
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn('[SOS] bringAppToSosAlarm failed', error);
    return false;
  }
}
