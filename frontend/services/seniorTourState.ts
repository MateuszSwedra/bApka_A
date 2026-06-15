import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'seniorTour_v2:';
const SKIPPED_KEY = `${PREFIX}skipped`;
const COMPLETE_KEY = `${PREFIX}complete`;

export type SeniorTourStepId =
  | 'today-take-med'
  | 'today-plan'
  | 'hybrid-settings'
  | 'hybrid-tabs'
  | 'treatments-add'
  | 'treatments-edit'
  | 'calendar-fab'
  | 'calendar-edit'
  | 'insights-range'
  | 'settings-vitals'
  | 'settings-color-blind'
  | 'settings-high-contrast'
  | 'settings-language'
  | 'settings-reminder-sound';

function storageKey(stepId: SeniorTourStepId): string {
  return `${PREFIX}${stepId}`;
}

export async function getSeniorTourStepSeen(stepId: SeniorTourStepId): Promise<boolean> {
  try {
    const key = storageKey(stepId);
    if (Platform.OS === 'web') {
      return localStorage.getItem(key) === 'true';
    }
    return (await SecureStore.getItemAsync(key)) === 'true';
  } catch {
    return false;
  }
}

export async function setSeniorTourStepSeen(stepId: SeniorTourStepId): Promise<void> {
  const key = storageKey(stepId);
  if (Platform.OS === 'web') {
    localStorage.setItem(key, 'true');
    return;
  }
  await SecureStore.setItemAsync(key, 'true');
}

export const ALL_SENIOR_TOUR_STEP_IDS: SeniorTourStepId[] = [
  'today-take-med',
  'today-plan',
  'hybrid-settings',
  'hybrid-tabs',
  'treatments-add',
  'treatments-edit',
  'calendar-fab',
  'calendar-edit',
  'insights-range',
  'settings-vitals',
  'settings-color-blind',
  'settings-high-contrast',
  'settings-language',
  'settings-reminder-sound',
];

async function readFlag(key: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key) === 'true';
    }
    return (await SecureStore.getItemAsync(key)) === 'true';
  } catch {
    return false;
  }
}

async function writeFlag(key: string, value: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value ? 'true' : 'false');
    return;
  }
  await SecureStore.setItemAsync(key, value ? 'true' : 'false');
}

async function deleteFlag(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    /* ignore */
  }
}

export async function isSeniorTourSkipped(): Promise<boolean> {
  return readFlag(SKIPPED_KEY);
}

export async function isSeniorTourComplete(): Promise<boolean> {
  return readFlag(COMPLETE_KEY);
}

export async function setSeniorTourComplete(): Promise<void> {
  await writeFlag(COMPLETE_KEY, true);
}

export async function markSeniorTourStepsSeen(stepIds: SeniorTourStepId[]): Promise<void> {
  await Promise.all(stepIds.map((stepId) => setSeniorTourStepSeen(stepId)));
}

export async function skipSeniorTour(): Promise<void> {
  await writeFlag(SKIPPED_KEY, true);
  await writeFlag(COMPLETE_KEY, true);
  await markSeniorTourStepsSeen(ALL_SENIOR_TOUR_STEP_IDS);
}

/** Czyści stan podpowiedzi — przy rejestracji lub wyborze trybu samodzielnego. */
export async function resetSeniorTourState(): Promise<void> {
  await Promise.all([
    deleteFlag(SKIPPED_KEY),
    deleteFlag(COMPLETE_KEY),
    ...ALL_SENIOR_TOUR_STEP_IDS.map(async (stepId) => {
      const key = storageKey(stepId);
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(key);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch {
        /* ignore */
      }
    }),
  ]);
}
