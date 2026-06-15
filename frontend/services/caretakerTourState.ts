import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'caretakerTour_v1_';

export type CaretakerTourStepId =
  | 'dashboard-add-dependent'
  | 'dashboard-sounds'
  | 'pairing-pin'
  | 'dependent-tabs'
  | 'dependent-settings'
  | 'treatments-add'
  | 'treatments-edit'
  | 'calendar-fab'
  | 'calendar-edit'
  | 'insights-range'
  | 'settings-mood'
  | 'settings-mood-time'
  | 'settings-vitals'
  | 'settings-color-blind'
  | 'settings-high-contrast'
  | 'settings-senior-language'
  | 'settings-caretaker-language'
  | 'settings-reminder-sound'
  | 'sounds-medication';

function storageKey(stepId: CaretakerTourStepId): string {
  return `${PREFIX}${stepId}`;
}

export async function getCaretakerTourStepSeen(stepId: CaretakerTourStepId): Promise<boolean> {
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

export async function setCaretakerTourStepSeen(stepId: CaretakerTourStepId): Promise<void> {
  const key = storageKey(stepId);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, 'true');
      return;
    }
    await SecureStore.setItemAsync(key, 'true');
  } catch {
    /* SecureStore odrzuca nieprawidłowy klucz — nie blokuj UI */
  }
}

const ALL_STEP_IDS: CaretakerTourStepId[] = [
  'dashboard-add-dependent',
  'dashboard-sounds',
  'pairing-pin',
  'dependent-tabs',
  'dependent-settings',
  'treatments-add',
  'treatments-edit',
  'calendar-fab',
  'calendar-edit',
  'insights-range',
  'settings-mood',
  'settings-mood-time',
  'settings-vitals',
  'settings-color-blind',
  'settings-high-contrast',
  'settings-senior-language',
  'settings-caretaker-language',
  'settings-reminder-sound',
  'sounds-medication',
];

/** Czyści stan podpowiedzi — wywoływane przy rejestracji nowego konta. */
export async function resetCaretakerTourState(): Promise<void> {
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
