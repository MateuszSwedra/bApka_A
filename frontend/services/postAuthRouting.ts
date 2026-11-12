import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { needsFullScreenIntentPrompt } from './fullScreenIntentPermission';
import { hasCompletedNotificationOnboarding } from './notificationOnboarding';

export type UserRole = 'CARETAKER' | 'DEPENDENT' | 'HYBRID';

export type MeProfile = {
  role?: string | null;
  name?: string | null;
  roleSelected?: boolean | null;
  isPairedWithCaretaker?: boolean;
  hasPushToken?: boolean;
};

export type PostAuthRoute =
  | '/onboarding-name'
  | '/enter-pin'
  | '/notification'
  | '/notification?focus=fsi'
  | '/(caretaker)'
  | '/(dependent)'
  | '/(hybrid)/(tabs)'
  | '/role-selection';

export type PostAuthRouteOptions = {
  needsDisplayName?: boolean;
  storedRole?: string | null;
  skipNotificationCheck?: boolean;
};

function normalizeRole(me: MeProfile | null, storedRole?: string | null): UserRole | null {
  const role = me?.role ?? storedRole;
  if (role === 'CARETAKER' || role === 'DEPENDENT' || role === 'HYBRID') return role;
  return null;
}

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
  if (await hasCompletedNotificationOnboarding()) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    // Już zaakceptowane w systemie — nie pokazuj ekranu drugi raz (token dociągnie sync).
    if (status === 'granted') return false;
  } catch {
    // brak statusu — poniżej decyzja po tokenie
  }
  // Brak tokenu w profilu albo brak zgody OS → jeden prompt przy onboardingu.
  return !me?.hasPushToken;
}

export function hasCompletedRoleSelection(me: MeProfile | null): boolean {
  if (!me) return false;
  if (typeof me.roleSelected === 'boolean') {
    return me.roleSelected === true;
  }
  return false;
}

export async function resolvePostAuthRoute(
  me: MeProfile | null,
  options: PostAuthRouteOptions = {},
): Promise<PostAuthRoute> {
  if (options.needsDisplayName) return '/onboarding-name';

  if (!hasCompletedRoleSelection(me)) return '/role-selection';

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
