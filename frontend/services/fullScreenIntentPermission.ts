import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import { canUseFullScreenIntent } from 'react-native-permissions';

type SosReceiverRole = 'CARETAKER' | 'HYBRID';

export function isSosReceiverRole(role: string | null | undefined): role is SosReceiverRole {
  return role === 'CARETAKER' || role === 'HYBRID';
}

/** Android 14+ wymaga ręcznego włączenia „Pełnoekranowych intencji” w ustawieniach. */
export function needsFullScreenIntentSettingsPrompt(): boolean {
  if (Platform.OS !== 'android') return false;
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  return Number.isFinite(api) && api >= 34;
}

/** Czy system pozwala aplikacji na pełnoekranowe intencje (Android 14+). */
export async function isFullScreenIntentGranted(): Promise<boolean> {
  if (!needsFullScreenIntentSettingsPrompt()) return true;
  try {
    return await canUseFullScreenIntent();
  } catch {
    return false;
  }
}

/** Czy opiekun / hybryda powinien zobaczyć prośbę o pełnoekranowe intencje. */
export async function needsFullScreenIntentPrompt(
  role: string | null | undefined,
): Promise<boolean> {
  if (!isSosReceiverRole(role)) return false;
  if (!needsFullScreenIntentSettingsPrompt()) return false;
  return !(await isFullScreenIntentGranted());
}

function resolveAndroidPackage(): string {
  const fromConfig = Constants.expoConfig?.android?.package;
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'com.bapka.app';
}

/** Otwiera ekran systemowy „Pełnoekranowe intencje” dla tej aplikacji. */
export async function openFullScreenIntentSettings(): Promise<void> {
  const pkg = resolveAndroidPackage();

  try {
    await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT', [
      { key: 'android.intent.extra.PACKAGE_NAME', value: pkg },
    ]);
    return;
  } catch {
    /* fallback poniżej */
  }

  try {
    await Linking.openURL(`package:${pkg}`);
    return;
  } catch {
    /* fallback poniżej */
  }

  try {
    await Linking.openSettings();
  } catch {
    /* ignore */
  }
}

export type FullScreenIntentPromptCopy = {
  title: string;
  message: string;
  openSettings: string;
  later: string;
};

/**
 * Prośba (Alert + ustawienia) dla opiekuna / hybrydy, gdy brak pełnoekranowych intencji.
 * Zwraca true, gdy pokazano dialog.
 */
export async function promptFullScreenIntentIfNeeded(
  role: string | null | undefined,
  copy: FullScreenIntentPromptCopy,
): Promise<boolean> {
  if (!(await needsFullScreenIntentPrompt(role))) return false;

  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.message, [
      {
        text: copy.later,
        style: 'cancel',
        onPress: () => resolve(true),
      },
      {
        text: copy.openSettings,
        onPress: () => {
          void openFullScreenIntentSettings();
          resolve(true);
        },
      },
    ]);
  });
}
