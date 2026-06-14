import { AppState, InteractionManager, Platform } from 'react-native';
import { router } from 'expo-router';
import { cancelAllNotifeeNotifications } from './notifeeSafe';
import { presentSosInBackground, type SosDisplayParams } from './sosNotifeeDisplay';

export type SosAlarmParams = {
  dependentId?: string;
  dependentName?: string;
  body?: string;
};

export type SosPresentParams = SosAlarmParams & {
  title?: string;
};

const DEDUPE_MS = 4000;
let lastKey = '';
let lastAt = 0;

function dedupeKey(params: SosPresentParams): string {
  return `${params.dependentId ?? ''}:${params.body ?? ''}`;
}

export function fillSosPresentParams(params: SosPresentParams): SosDisplayParams {
  const title = params.title?.trim() || 'SOS!';
  const body =
    params.body?.trim() ||
    (params.dependentName
      ? `${params.dependentName} nacisnął(a) przycisk SOS!`
      : 'Podopieczny nacisnął przycisk SOS!');
  return {
    title,
    body,
    dependentId: params.dependentId,
    dependentName: params.dependentName,
  };
}

export function parseSosPayload(data: Record<string, unknown> | undefined): SosAlarmParams | null {
  if (!data || data.type !== 'sos') return null;
  return {
    dependentId: typeof data.dependentId === 'string' ? data.dependentId : '',
    dependentName: typeof data.dependentName === 'string' ? data.dependentName : '',
    body: typeof data.body === 'string' ? data.body : '',
  };
}

export function navigateToSosAlarm(params: SosAlarmParams = {}): void {
  if (Platform.OS === 'web') return;

  void cancelAllNotifeeNotifications();

  const go = () => {
    router.replace({
      pathname: '/sos-alarm',
      params: {
        dependentId: params.dependentId ?? '',
        dependentName: params.dependentName ?? '',
        body: params.body ?? '',
      },
    });
  };

  InteractionManager.runAfterInteractions(go);
}

type SosNavigationListener = (params: SosPresentParams) => void;
const listeners = new Set<SosNavigationListener>();
let pending: SosPresentParams | null = null;

/** Rejestruj w React (SosAlarmBootstrap) — nawigacja z handlerów push wymaga gotowego routera. */
export function subscribeSosNavigation(listener: SosNavigationListener): () => void {
  listeners.add(listener);
  if (pending) {
    listener(pending);
    pending = null;
  }
  return () => listeners.delete(listener);
}

function dispatchSosNavigation(params: SosPresentParams): void {
  if (listeners.size === 0) {
    pending = params;
    return;
  }
  for (const listener of listeners) {
    listener(params);
  }
}

/**
 * Jedno wejście dla Expo push, FCM (foreground/background) i Notifee.
 * Apka na wierzchu → od razu pełnoekranowy /sos-alarm (bez banera Notifee).
 * W tle → deep link do /sos-alarm + Notifee FSI gdy ekran wygaszony.
 */
export function presentSosAlarm(params: SosPresentParams): void {
  if (Platform.OS === 'web') return;

  const key = dedupeKey(params);
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUPE_MS) return;
  lastKey = key;
  lastAt = now;

  const filled = fillSosPresentParams(params);
  const foreground = AppState.currentState === 'active';

  if (foreground) {
    void cancelAllNotifeeNotifications();
    dispatchSosNavigation({ ...params, ...filled });
    return;
  }

  void presentSosInBackground(filled);
}
