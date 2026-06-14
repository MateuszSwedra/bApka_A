import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { usersAPI } from './api';
import { syncPushTokenWithBackend } from './registerPushToken';
import {
  needsFullScreenIntentPrompt,
  promptFullScreenIntentIfNeeded,
  isSosReceiverRole,
} from './fullScreenIntentPermission';
import { needsNotificationPrompt, type MeProfile, type UserRole } from './postAuthRouting';

const SKIP_PATH_PREFIXES = [
  '/notification',
  '/login',
  '/welcome',
  '/consents',
  '/onboarding-name',
  '/role-selection',
  '/enter-pin',
  '/senior-type',
  '/profile-ready',
];

function shouldSkipPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return SKIP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type PermissionGuardCopy = {
  fsiTitle: string;
  fsiMessage: string;
  fsiOpenSettings: string;
  fsiLater: string;
};

/** Czy użytkownik powinien zobaczyć ekran / dialog powiadomień. */
export async function shouldPromptForPushPermissions(
  me: MeProfile | null,
  role: UserRole | null,
): Promise<boolean> {
  if (Platform.OS === 'web' || !role) return false;
  if (await needsNotificationPrompt(me, role)) return true;
  if (await needsFullScreenIntentPrompt(role)) return true;
  return false;
}

/**
 * Po powrocie do aplikacji: odśwież token, przekieruj na ekran powiadomień lub pokaż dialog FSI.
 */
export async function enforcePushPermissionsOnResume(
  pathname: string | null,
  role: UserRole | null,
  copy?: PermissionGuardCopy,
): Promise<void> {
  if (Platform.OS === 'web' || !role || shouldSkipPath(pathname)) return;

  let me: MeProfile | null = null;
  try {
    me = (await usersAPI.getMe()) as MeProfile;
  } catch {
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') {
    void syncPushTokenWithBackend();
  }

  if (await needsNotificationPrompt(me, role)) {
    router.push('/notification');
    return;
  }

  if (copy && isSosReceiverRole(role) && (await needsFullScreenIntentPrompt(role))) {
    await promptFullScreenIntentIfNeeded(role, {
      title: copy.fsiTitle,
      message: copy.fsiMessage,
      openSettings: copy.fsiOpenSettings,
      later: copy.fsiLater,
    });
  }
}
