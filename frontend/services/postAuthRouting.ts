import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { needsFullScreenIntentPrompt } from './fullScreenIntentPermission';

export type UserRole = 'CARETAKER' | 'DEPENDENT' | 'HYBRID';

export type MeProfile = {
  role?: string | null;
  name?: string | null;
  isPairedWithCaretaker?: boolean;
  hasPushToken?: boolean;
};

export type PostAuthRoute =
  | '/onboarding-name'
  | '/enter-pin'
  | '/notification'
  | '/(caretaker)'
  | '/(dependent)'
  | '/(hybrid)/(tabs)'
  | '/role-selection';

export type PostAuthRouteOptions = {
  needsDisplayName?: boolean;
  storedRole?: string | null;
  /** Ekran powiadomień — po „Pomiń” idziemy dalej bez ponownego pytania w tej sesji. */
  skipNotificationCheck?: boolean;
};

function normalizeRole(me: MeProfile | null, storedRole?: string | null): UserRole | null {
  const role = me?.role ?? storedRole;
  if (role === 'CARETAKER' || role === 'DEPENDENT' || role === 'HYBRID') return role;
  return null;
}

/** Senior (DEPENDENT) bez potwierdzonej pary z opiekunem musi wpisać PIN. */
export function dependentNeedsCaretakerPin(me: MeProfile | null, storedRole?: string | null): boolean {
  const role = normalizeRole(me, storedRole);
  if (role !== 'DEPENDENT') return false;
  return me?.isPairedWithCaretaker !== true;
}

export async function needsNotificationPrompt(
  me: MeProfile | null,
  role: UserRole | null,
): Promise<boolean> {
  if (Platform.OS === 'web' || !role) return false;
  if (!me?.hasPushToken) return true;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status !== 'granted';
  } catch {
    return true;
  }
}

export async function resolvePostAuthRoute(
  me: MeProfile | null,
  options: PostAuthRouteOptions = {},
): Promise<PostAuthRoute> {
  if (options.needsDisplayName) return '/onboarding-name';

  const role = normalizeRole(me, options.storedRole);
  if (!role) return '/role-selection';

  if (dependentNeedsCaretakerPin(me, options.storedRole)) return '/enter-pin';

  if (!options.skipNotificationCheck && (await needsNotificationPrompt(me, role))) {
    return '/notification';
  }

  if (!options.skipNotificationCheck && (await needsFullScreenIntentPrompt(role))) {
    return '/notification?focus=fsi';
  }

  if (role === 'CARETAKER') return '/(caretaker)';
  if (role === 'DEPENDENT') return '/(dependent)';
  return '/(hybrid)/(tabs)';
}
