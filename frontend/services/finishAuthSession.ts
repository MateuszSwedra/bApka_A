import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { usersAPI } from './api';
import {
  hasCompletedRoleSelection,
  resolvePostAuthRoute,
  type MeProfile,
} from './postAuthRouting';
import { clearGoogleIdTokenLock } from '../utils/googleWebRedirect';

type AuthUser = {
  role?: string | null;
  name?: string | null;
  roleSelected?: boolean | null;
};

async function setNeedsDisplayName(needed: boolean) {
  if (Platform.OS === 'web') {
    if (needed) localStorage.setItem('needsDisplayName', 'true');
    else localStorage.removeItem('needsDisplayName');
    return;
  }
  if (needed) await SecureStore.setItemAsync('needsDisplayName', 'true');
  else await SecureStore.deleteItemAsync('needsDisplayName');
}

async function persistTokenWithoutRole(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('userToken', token);
    localStorage.removeItem('userRole');
    return;
  }
  await SecureStore.setItemAsync('userToken', token);
  try {
    await SecureStore.deleteItemAsync('userRole');
  } catch {
    /* ignore */
  }
}

async function loadAuthoritativeProfile(fallback: AuthUser): Promise<MeProfile> {
  const base: MeProfile = {
    role: fallback.role,
    name: fallback.name,
    // Nie rzutuj undefined → false (to psuło „stary” payload i świeży getMe).
    roleSelected: fallback.roleSelected,
  };

  try {
    const me = (await usersAPI.getMe()) as MeProfile;
    return {
      role: me.role ?? base.role,
      name: me.name ?? base.name,
      roleSelected: me.roleSelected,
      isPairedWithCaretaker: me.isPairedWithCaretaker,
      hasPushToken: me.hasPushToken,
    };
  } catch {
    return base;
  }
}

/**
 * Po login / Google / register: kieruj wg roleSelected z getMe (źródło prawdy).
 */
export async function finishAuthSession(options: {
  accessToken: string;
  user: AuthUser;
  setUserSession: (token: string, role: 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null) => Promise<void>;
  resetTours?: boolean;
}): Promise<void> {
  const { accessToken, user, setUserSession } = options;

  // Token najpierw — getMe wymaga Authorization.
  await persistTokenWithoutRole(accessToken);

  const profile = await loadAuthoritativeProfile(user);
  const needsName = !profile.name?.trim();
  await setNeedsDisplayName(needsName);

  try {
    if (!hasCompletedRoleSelection(profile)) {
      if (options.resetTours) {
        const { resetCaretakerTourState } = await import('./caretakerTourState');
        const { resetSeniorTourState } = await import('./seniorTourState');
        await resetCaretakerTourState();
        await resetSeniorTourState();
      }
      router.replace(needsName ? '/onboarding-name' : '/role-selection');
      return;
    }

    const role = profile.role;
    if (role === 'CARETAKER' || role === 'DEPENDENT' || role === 'HYBRID') {
      await setUserSession(accessToken, role);
    }

    if (needsName) {
      router.replace('/onboarding-name');
      return;
    }

    const destination = await resolvePostAuthRoute(profile, {
      needsDisplayName: false,
      storedRole: role ?? null,
    });
    router.replace(destination as Parameters<typeof router.replace>[0]);
  } finally {
    clearGoogleIdTokenLock();
  }
}
