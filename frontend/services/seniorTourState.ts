import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'seniorTour_v1:';

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

const ALL_STEP_IDS: SeniorTourStepId[] = [
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

/** Czyści stan podpowiedzi — przy rejestracji lub wyborze trybu samodzielnego. */
export async function resetSeniorTourState(): Promise<void> {
  await Promise.all(
    ALL_STEP_IDS.map(async (stepId) => {
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
  );
}
