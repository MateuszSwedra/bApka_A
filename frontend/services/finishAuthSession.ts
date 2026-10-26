import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import {
  hasCompletedRoleSelection,
  resolvePostAuthRoute,
  type MeProfile,
} from './postAuthRouting';

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

/** Token bez roli w storage — użytkownik musi przejść role-selection. */
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

/**
 * Po login / Google / register: kieruj wg roleSelected (nie zakładaj DEPENDENT).
 * setUserSession — tylko gdy rola została już wybrana.
 */
export async function finishAuthSession(options: {
  accessToken: string;
  user: AuthUser;
  setUserSession: (token: string, role: 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null) => Promise<void>;
  /** Po rejestracji / nowym Google wyczyść flagi tourów wcześniej. */
  resetTours?: boolean;
}): Promise<void> {
  const { accessToken, user, setUserSession } = options;
  const needsName = !user?.name?.trim();
  const me: MeProfile = {
    role: user?.role,
    name: user?.name,
    roleSelected: user?.roleSelected === true,
  };

  await setNeedsDisplayName(needsName);

  if (!hasCompletedRoleSelection(me)) {
    await persistTokenWithoutRole(accessToken);
    if (options.resetTours) {
      const { resetCaretakerTourState } = await import('./caretakerTourState');
      const { resetSeniorTourState } = await import('./seniorTourState');
      await resetCaretakerTourState();
      await resetSeniorTourState();
    }
    router.replace(needsName ? '/onboarding-name' : '/role-selection');
    return;
  }

  const role = user.role;
  if (role === 'CARETAKER' || role === 'DEPENDENT' || role === 'HYBRID') {
    await setUserSession(accessToken, role);
  } else {
    await persistTokenWithoutRole(accessToken);
  }

  if (needsName) {
    router.replace('/onboarding-name');
    return;
  }

  const destination = await resolvePostAuthRoute(me, {
    needsDisplayName: false,
    storedRole: role ?? null,
  });
  router.replace(destination as Parameters<typeof router.replace>[0]);
}

export async function persistRegisterLikeSession(accessToken: string) {
  await persistTokenWithoutRole(accessToken);
  await setNeedsDisplayName(true);
}
