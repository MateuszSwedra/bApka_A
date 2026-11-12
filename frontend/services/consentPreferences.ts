import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CONSENT_PREFS_KEY = 'consentPrefs';
const HAS_SEEN_CONSENTS_KEY = 'hasSeenConsents';

export type ConsentPreferences = {
  allAccepted: boolean;
  analytics: boolean;
  tailoredContent: boolean;
  at: string;
};

const DEFAULT_PREFS: ConsentPreferences = {
  allAccepted: false,
  analytics: false,
  tailoredContent: false,
  at: '',
};

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
  }
}

export function parseConsentPreferences(raw: string | null): ConsentPreferences {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    const analytics = parsed.analytics === true;
    const tailoredContent = parsed.tailoredContent === true;
    return {
      allAccepted: parsed.allAccepted === true || (analytics && tailoredContent),
      analytics,
      tailoredContent,
      at: typeof parsed.at === 'string' ? parsed.at : '',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function getConsentPreferences(): Promise<ConsentPreferences> {
  return parseConsentPreferences(await storageGet(CONSENT_PREFS_KEY));
}

export async function setConsentPreferences(input: {
  analytics: boolean;
  tailoredContent: boolean;
}): Promise<ConsentPreferences> {
  const next: ConsentPreferences = {
    allAccepted: input.analytics && input.tailoredContent,
    analytics: input.analytics,
    tailoredContent: input.tailoredContent,
    at: new Date().toISOString(),
  };
  await storageSet(CONSENT_PREFS_KEY, JSON.stringify(next));
  return next;
}

export async function markConsentsSeen(): Promise<void> {
  await storageSet(HAS_SEEN_CONSENTS_KEY, 'true');
}
