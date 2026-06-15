import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'caretakerTour_v4:';
const SKIPPED_KEY = `${PREFIX}skipped`;
const PRE_COMPLETE_KEY = `${PREFIX}pre-complete`;
const POST_COMPLETE_KEY = `${PREFIX}post-complete`;

export type CaretakerTourStepId =
  | 'dashboard-add-dependent'
  | 'dashboard-sounds'
  | 'pairing-pin'
  | 'dependent-tabs'
  | 'dependent-settings'
  | 'tour-tab-today'
  | 'tour-tab-calendar'
  | 'tour-tab-treatments'
  | 'tour-tab-insights'
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

export const ALL_CARETAKER_TOUR_STEP_IDS: CaretakerTourStepId[] = [
  'dashboard-add-dependent',
  'dashboard-sounds',
  'pairing-pin',
  'dependent-tabs',
  'dependent-settings',
  'tour-tab-today',
  'tour-tab-calendar',
  'tour-tab-treatments',
  'tour-tab-insights',
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

export async function isCaretakerTourSkipped(): Promise<boolean> {
  return readFlag(SKIPPED_KEY);
}

export async function isCaretakerPreTourComplete(): Promise<boolean> {
  return readFlag(PRE_COMPLETE_KEY);
}

export async function isCaretakerPostTourComplete(): Promise<boolean> {
  return readFlag(POST_COMPLETE_KEY);
}

export async function setCaretakerPreTourComplete(): Promise<void> {
  await writeFlag(PRE_COMPLETE_KEY, true);
}

export async function setCaretakerPostTourComplete(): Promise<void> {
  await writeFlag(POST_COMPLETE_KEY, true);
}

export async function markCaretakerTourStepsSeen(
  stepIds: CaretakerTourStepId[],
): Promise<void> {
  await Promise.all(stepIds.map((stepId) => setCaretakerTourStepSeen(stepId)));
}

/** Pomija cały tutorial opiekuna i oznacza wszystkie kroki jako obejrzane. */
export async function skipCaretakerTour(): Promise<void> {
  await writeFlag(SKIPPED_KEY, true);
  await writeFlag(PRE_COMPLETE_KEY, true);
  await writeFlag(POST_COMPLETE_KEY, true);
  await markCaretakerTourStepsSeen(ALL_CARETAKER_TOUR_STEP_IDS);
}

/** Czyści stan podpowiedzi — wywoływane przy rejestracji nowego konta. */
export async function resetCaretakerTourState(): Promise<void> {
  await Promise.all([
    deleteFlag(SKIPPED_KEY),
    deleteFlag(PRE_COMPLETE_KEY),
    deleteFlag(POST_COMPLETE_KEY),
    ...ALL_CARETAKER_TOUR_STEP_IDS.map(async (stepId) => {
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
